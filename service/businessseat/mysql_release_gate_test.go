package businessseat

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func mysqlDSNOrSkip(t *testing.T) string {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("TEST_MYSQL_DSN"))
	if dsn == "" {
		t.Skip("TEST_MYSQL_DSN is not configured")
	}
	return dsn
}

func setupBusinessSeatMySQLTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := mysqlDSNOrSkip(t)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	previous := model.DB
	model.DB = db
	common.SetDatabaseTypes(common.DatabaseTypeMySQL, common.DatabaseTypeMySQL)
	t.Cleanup(func() {
		model.DB = previous
		_ = sqlDB.Close()
	})
	require.NoError(t, db.AutoMigrate(
		&model.BusinessWorkspace{},
		&model.BusinessProduct{},
		&model.BusinessPriceVersion{},
		&model.BusinessQuote{},
		&model.BusinessSeatOrder{},
		&model.BusinessSeatOrderItem{},
		&model.BusinessSeatSubscription{},
		&model.BusinessSeat{},
		&model.BusinessSeatTask{},
		&model.BusinessSeatAuditLog{},
	))
	resetBusinessSeatMySQLTables(t, db)
	require.NoError(t, model.EnsureBusinessProductSeed())
	return db
}

func resetBusinessSeatMySQLTables(t *testing.T, db *gorm.DB) {
	t.Helper()
	tables := []string{
		"business_seat_audit_logs",
		"business_seat_tasks",
		"business_seats",
		"business_seat_subscriptions",
		"business_seat_order_items",
		"business_seat_orders",
		"business_quotes",
		"business_price_versions",
		"business_products",
		"business_workspaces",
	}
	require.NoError(t, db.Exec("SET FOREIGN_KEY_CHECKS=0").Error)
	for _, table := range tables {
		require.NoError(t, db.Exec("TRUNCATE TABLE " + table).Error)
	}
	require.NoError(t, db.Exec("SET FOREIGN_KEY_CHECKS=1").Error)
}

func TestMySQLDecimalPrecision(t *testing.T) {
	setupBusinessSeatMySQLTestDB(t)
	var product model.BusinessProduct
	require.NoError(t, model.DB.Where("code = ?", model.BusinessProductCodeStandard).First(&product).Error)

	amounts := []string{"199.00", "199.01", "0.01", "9999.99"}
	for i, amount := range amounts {
		pv := model.BusinessPriceVersion{
			ProductId:      product.Id,
			PriceAmount:    decimal.RequireFromString(amount),
			Currency:       "CNY",
			BillingCadence: model.BusinessBillingCadenceMonthly,
			DisplayUnit:    "/ month",
			EffectiveFrom:  int64(i + 1),
			Enabled:        true,
		}
		require.NoError(t, model.CreateBusinessPriceVersion(&pv))
		var stored model.BusinessPriceVersion
		require.NoError(t, model.DB.First(&stored, pv.Id).Error)
		assert.True(t, stored.PriceAmount.Equal(decimal.RequireFromString(amount)), "amount %s", amount)
	}
}

func TestMySQLNullableProviderTradeNo(t *testing.T) {
	setupBusinessSeatMySQLTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))

	for i := 0; i < 3; i++ {
		order := createPayingOrder(t, 500+i, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
		var refreshed model.BusinessSeatOrder
		require.NoError(t, model.DB.First(&refreshed, order.Id).Error)
		assert.Nil(t, refreshed.ProviderTradeNo)
	}

	orderPaid := createPayingOrder(t, 510, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
	_, err := NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: orderPaid.OrderNo, ProviderTradeNo: "unique-trade-001",
		PaidAmount: decimal.RequireFromString("100.00"), Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, err)

	orderDup := createPayingOrder(t, 511, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
	_, err = NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: orderDup.OrderNo, ProviderTradeNo: "unique-trade-001",
		PaidAmount: decimal.RequireFromString("100.00"), Currency: "CNY", PaymentChannel: "alipay",
	})
	require.Error(t, err)
}

func TestMySQLPaymentIdempotencyDuplicateNotify(t *testing.T) {
	setupBusinessSeatMySQLTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	order := createPayingOrder(t, 99, ws, product, pv, decimal.RequireFromString("250.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())

	svc := NewProvisioningService()
	for i := 0; i < 10; i++ {
		_, err := svc.ProcessPayment(PaymentConfirmInput{
			OrderNo: order.OrderNo, ProviderTradeNo: "mysql-trade-123",
			PaidAmount: decimal.RequireFromString("250.00"), Currency: "CNY", PaymentChannel: "alipay",
		})
		require.NoError(t, err)
	}

	var paidCount, subCount, reserved, taskCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatOrder{}).Where("status = ?", model.BusinessOrderStatusPaid).Count(&paidCount).Error)
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Count(&subCount).Error)
	require.NoError(t, model.DB.Model(&model.BusinessSeat{}).Where("status = ?", model.BusinessSeatStatusReserved).Count(&reserved).Error)
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ?", model.BusinessTaskTypeInviteMember).Count(&taskCount).Error)
	assert.EqualValues(t, 1, paidCount)
	assert.EqualValues(t, 1, subCount)
	assert.EqualValues(t, 1, reserved)
	assert.EqualValues(t, 1, taskCount)
}

func TestMySQLConcurrentLastSeatAllocation(t *testing.T) {
	setupBusinessSeatMySQLTestDB(t)
	rounds := 50
	if v := strings.TrimSpace(os.Getenv("TEST_MYSQL_CONCURRENCY_ROUNDS")); v != "" {
		var parsed int
		_, err := fmt.Sscanf(v, "%d", &parsed)
		if err == nil && parsed > 0 {
			rounds = parsed
		}
	}

	loc, _ := time.LoadLocation("Asia/Shanghai")
	var duplicateAllocations atomic.Int64
	svc := NewProvisioningService()

	for round := 0; round < rounds; round++ {
		resetBusinessSeatMySQLTables(t, model.DB)
		require.NoError(t, model.EnsureBusinessProductSeed())

		ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
		orderA := createPayingOrder(t, 1000+round*2, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
		orderB := createPayingOrder(t, 1001+round*2, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
		orderA.ChatgptEmail = fmt.Sprintf("a%d@gmail.com", round)
		orderB.ChatgptEmail = fmt.Sprintf("b%d@gmail.com", round)
		require.NoError(t, model.DB.Save(orderA).Error)
		require.NoError(t, model.DB.Save(orderB).Error)

		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			_, _ = svc.ProcessPayment(PaymentConfirmInput{
				OrderNo: orderA.OrderNo, ProviderTradeNo: fmt.Sprintf("ta-%d", round),
				PaidAmount: decimal.RequireFromString("100.00"), Currency: "CNY", PaymentChannel: "alipay",
			})
		}()
		go func() {
			defer wg.Done()
			_, _ = svc.ProcessPayment(PaymentConfirmInput{
				OrderNo: orderB.OrderNo, ProviderTradeNo: fmt.Sprintf("tb-%d", round),
				PaidAmount: decimal.RequireFromString("100.00"), Currency: "CNY", PaymentChannel: "alipay",
			})
		}()
		wg.Wait()

		var reserved int64
		require.NoError(t, model.DB.Model(&model.BusinessSeat{}).Where("status = ?", model.BusinessSeatStatusReserved).Count(&reserved).Error)
		if reserved > 1 {
			duplicateAllocations.Add(reserved - 1)
		}
		assert.EqualValues(t, 1, reserved, "round %d reserved seat count", round)

		var pendingCapacity int64
		require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Where("status = ?", model.BusinessSubscriptionStatusPendingCapacity).Count(&pendingCapacity).Error)
		assert.EqualValues(t, 1, pendingCapacity, "round %d pending capacity", round)

		var addSeatTasks int64
		require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).
			Where("task_type = ? AND status = ?", model.BusinessTaskTypeAddSeat, model.BusinessTaskStatusOpen).
			Count(&addSeatTasks).Error)
		assert.EqualValues(t, 1, addSeatTasks, "round %d add seat tasks", round)
	}

	assert.EqualValues(t, 0, duplicateAllocations.Load(), "duplicate seat allocations across rounds")
}
