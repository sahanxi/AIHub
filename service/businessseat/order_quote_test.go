package businessseat

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupOrderQuoteTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	previous := model.DB
	model.DB = db
	t.Cleanup(func() { model.DB = previous })
	require.NoError(t, db.AutoMigrate(
		&model.BusinessQuote{},
		&model.BusinessSeatOrder{},
		&model.BusinessSeatOrderItem{},
		&model.BusinessSeatAuditLog{},
	))
}

func TestCreateOrderFromQuoteReusesPayableOrderWhenQuoteUsed(t *testing.T) {
	setupOrderQuoteTestDB(t)
	now := time.Now().Unix()
	quote := model.BusinessQuote{
		UserId: 2, WorkspaceId: 1, ProductId: 1, PriceVersionId: 1,
		ChatgptEmail: "buyer@gmail.com", QuoteType: model.BusinessQuoteTypeCycleStartFull,
		QuoteAt: now, ExpiresAt: now + 900, Status: model.BusinessQuoteStatusUsed,
		OrderType: model.BusinessOrderTypeNew, Currency: "CNY",
		TotalAmount: decimal.RequireFromString("204.00"), CurrentCycleAmount: decimal.RequireFromString("204.00"),
		CycleStartAt: now, CycleEndAt: now + 86400, PrepaidThrough: now + 86400,
	}
	require.NoError(t, model.DB.Create(&quote).Error)

	existing := model.BusinessSeatOrder{
		OrderNo: "BS2NOresume01", UserId: 2, ProductId: 1, WorkspaceId: 1, PriceVersionId: 1,
		QuoteId: quote.Id, OrderType: model.BusinessOrderTypeNew, ChatgptEmail: quote.ChatgptEmail,
		Currency: "CNY", TotalAmount: quote.TotalAmount, CurrentCycleAmount: quote.CurrentCycleAmount,
		CycleStartAt: quote.CycleStartAt, CycleEndAt: quote.CycleEndAt, PrepaidThrough: quote.PrepaidThrough,
		Status: model.BusinessOrderStatusPaying, PaymentStatus: "PENDING",
		ProvisioningStatus: model.BusinessProvisioningStatusPending,
	}
	require.NoError(t, model.DB.Create(&existing).Error)

	order, err := NewOrderService().CreateOrderFromQuote(2, quote.Id, nil)
	require.NoError(t, err)
	require.NotNil(t, order)
	assert.Equal(t, existing.Id, order.Id)
	assert.Equal(t, model.BusinessOrderStatusPaying, order.Status)

	var orderCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatOrder{}).Count(&orderCount).Error)
	assert.EqualValues(t, 1, orderCount)
}

func TestCancelPendingBusinessQuotesForUser(t *testing.T) {
	setupOrderQuoteTestDB(t)
	now := time.Now().Unix()
	for i := 0; i < 2; i++ {
		require.NoError(t, model.DB.Create(&model.BusinessQuote{
			UserId: 9, WorkspaceId: 1, ProductId: 1, PriceVersionId: 1,
			ChatgptEmail: "new@gmail.com", QuoteType: model.BusinessQuoteTypeCycleStartFull,
			QuoteAt: now, ExpiresAt: now + 900, Status: model.BusinessQuoteStatusPending,
			OrderType: model.BusinessOrderTypeNew, Currency: "CNY", TotalAmount: decimal.RequireFromString("100"),
		}).Error)
	}
	require.NoError(t, model.CancelPendingBusinessQuotesForUser(9, "new@gmail.com", model.BusinessOrderTypeNew))

	var pending int64
	require.NoError(t, model.DB.Model(&model.BusinessQuote{}).
		Where("user_id = ? AND status = ?", 9, model.BusinessQuoteStatusPending).Count(&pending).Error)
	assert.Zero(t, pending)

	var cancelled int64
	require.NoError(t, model.DB.Model(&model.BusinessQuote{}).
		Where("user_id = ? AND status = ?", 9, model.BusinessQuoteStatusCancelled).Count(&cancelled).Error)
	assert.EqualValues(t, 2, cancelled)
}
