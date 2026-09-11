package businessseat

import (
	"errors"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupBusinessSeatTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	previous := model.DB
	model.DB = db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	t.Cleanup(func() { model.DB = previous })
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
	require.NoError(t, model.EnsureBusinessProductSeed())
	return db
}

func seedWorkspaceWithSeats(t *testing.T, seatCount int, anchor time.Time) (*model.BusinessWorkspace, *model.BusinessProduct, *model.BusinessPriceVersion) {
	t.Helper()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	anchor = anchor.In(loc)
	ws := &model.BusinessWorkspace{
		Name:                   "Test WS",
		Provider:               model.BusinessWorkspaceProviderOpenAI,
		WorkspaceType:          model.BusinessWorkspaceTypeChatGPTBusiness,
		Status:                 model.BusinessWorkspaceStatusActive,
		BillingCadence:         model.BusinessBillingCadenceMonthly,
		BillingAnchorAt:        anchor.Unix(),
		BillingTimezone:        "Asia/Shanghai",
		CycleStartGraceMinutes: 60,
		RenewalLeadDays:        DefaultRenewalLeadDays,
		TotalStandardSeats:     seatCount,
	}
	require.NoError(t, model.CreateBusinessWorkspace(ws))
	var product model.BusinessProduct
	require.NoError(t, model.DB.Where("code = ?", model.BusinessProductCodeStandard).First(&product).Error)
	pv := &model.BusinessPriceVersion{
		ProductId:      product.Id,
		PriceAmount:    decimal.RequireFromString("199"),
		Currency:       "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly,
		DisplayUnit:    "/ month",
		EffectiveFrom:  1,
		Enabled:        true,
	}
	require.NoError(t, model.CreateBusinessPriceVersion(pv))
	return ws, &product, pv
}

func occupySeatsActive(t *testing.T, workspaceId int, count int, userIdStart int, productId int, priceVersionId int) {
	t.Helper()
	var seats []model.BusinessSeat
	require.NoError(t, model.DB.Where("workspace_id = ? AND status = ?", workspaceId, model.BusinessSeatStatusAvailable).
		Order("seat_number asc").Limit(count).Find(&seats).Error)
	require.Len(t, seats, count)
	now := common.GetTimestamp()
	for i, seat := range seats {
		sub := model.BusinessSeatSubscription{
			UserId:                userIdStart + i,
			ProductId:             productId,
			WorkspaceId:           workspaceId,
			SeatId:                &seat.Id,
			ChatgptEmail:          "user@example.com",
			Status:                model.BusinessSubscriptionStatusActive,
			PrepaidThrough:        time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC).Unix(),
			CurrentPriceVersionId: priceVersionId,
		}
		require.NoError(t, model.DB.Create(&sub).Error)
		require.NoError(t, model.DB.Model(&seat).Updates(map[string]interface{}{
			"status": model.BusinessSeatStatusActive, "subscription_id": sub.Id, "user_id": sub.UserId,
			"assigned_email": sub.ChatgptEmail, "activated_at": now,
		}).Error)
	}
}

func createPayingOrder(t *testing.T, userId int, ws *model.BusinessWorkspace, product *model.BusinessProduct, pv *model.BusinessPriceVersion, total decimal.Decimal, prepaid int64) *model.BusinessSeatOrder {
	t.Helper()
	order := &model.BusinessSeatOrder{
		OrderNo:            model.GenerateBusinessSeatOrderNo(userId),
		UserId:             userId,
		ProductId:          product.Id,
		WorkspaceId:        ws.Id,
		PriceVersionId:     pv.Id,
		QuoteId:            1,
		OrderType:          model.BusinessOrderTypeNew,
		ChatgptEmail:       "newuser@gmail.com",
		Currency:           "CNY",
		CurrentCycleAmount: total,
		TotalAmount:        total,
		PrepaidThrough:     prepaid,
		Status:             model.BusinessOrderStatusPaying,
		PaymentStatus:      "PENDING",
		ProvisioningStatus: model.BusinessProvisioningStatusPending,
	}
	require.NoError(t, model.DB.Create(order).Error)
	return order
}

func TestPaymentIdempotencyDuplicateNotify(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	order := createPayingOrder(t, 99, ws, product, pv, decimal.RequireFromString("250.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())

	svc := NewProvisioningService()
	for i := 0; i < 10; i++ {
		_, err := svc.ProcessPayment(PaymentConfirmInput{
			OrderNo:         order.OrderNo,
			ProviderTradeNo: "trade-123",
			PaidAmount:      decimal.RequireFromString("250.00"),
			Currency:        "CNY",
			PaymentChannel:  "alipay",
		})
		require.NoError(t, err)
	}

	var paidCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatOrder{}).Where("status = ?", model.BusinessOrderStatusPaid).Count(&paidCount).Error)
	assert.EqualValues(t, 1, paidCount)

	var subCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Count(&subCount).Error)
	assert.EqualValues(t, 1, subCount)

	var reserved int64
	require.NoError(t, model.DB.Model(&model.BusinessSeat{}).Where("status = ?", model.BusinessSeatStatusReserved).Count(&reserved).Error)
	assert.EqualValues(t, 1, reserved)

	var taskCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ?", model.BusinessTaskTypeInviteMember).Count(&taskCount).Error)
	assert.EqualValues(t, 1, taskCount)
}

func TestPaymentAmountTamperingRejected(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	order := createPayingOrder(t, 100, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix())

	_, err := NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo:         order.OrderNo,
		ProviderTradeNo: "trade-tamper",
		PaidAmount:      decimal.RequireFromString("0.01"),
		Currency:        "CNY",
		PaymentChannel:  "alipay",
	})
	require.Error(t, err)

	var refreshed model.BusinessSeatOrder
	require.NoError(t, model.DB.First(&refreshed, order.Id).Error)
	assert.Equal(t, model.BusinessOrderStatusPaying, refreshed.Status)

	var subCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Count(&subCount).Error)
	assert.Zero(t, subCount)
}

func TestConcurrentLastSeatAllocation(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	orderA := createPayingOrder(t, 201, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
	orderB := createPayingOrder(t, 202, ws, product, pv, decimal.RequireFromString("100.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
	orderA.ChatgptEmail = "a@gmail.com"
	orderB.ChatgptEmail = "b@gmail.com"
	require.NoError(t, model.DB.Save(orderA).Error)
	require.NoError(t, model.DB.Save(orderB).Error)

	svc := NewProvisioningService()
	_, errA := svc.ProcessPayment(PaymentConfirmInput{
		OrderNo: orderA.OrderNo, ProviderTradeNo: "ta", PaidAmount: decimal.RequireFromString("100.00"),
		Currency: "CNY", PaymentChannel: "alipay",
	})
	_, errB := svc.ProcessPayment(PaymentConfirmInput{
		OrderNo: orderB.OrderNo, ProviderTradeNo: "tb", PaidAmount: decimal.RequireFromString("100.00"),
		Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, errA)
	require.NoError(t, errB)

	var reserved, pendingCapacity int64
	require.NoError(t, model.DB.Model(&model.BusinessSeat{}).Where("status = ?", model.BusinessSeatStatusReserved).Count(&reserved).Error)
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Where("status = ?", model.BusinessSubscriptionStatusPendingCapacity).Count(&pendingCapacity).Error)
	assert.EqualValues(t, 1, reserved)
	assert.EqualValues(t, 1, pendingCapacity)

	var addSeatTasks int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ? AND status = ?", model.BusinessTaskTypeAddSeat, model.BusinessTaskStatusOpen).Count(&addSeatTasks).Error)
	assert.EqualValues(t, 1, addSeatTasks)
}

func TestSubscriptionLookupRemovedThenActive(t *testing.T) {
	setupBusinessSeatTestDB(t)
	removed := model.BusinessSeatSubscription{
		UserId: 42, ProductId: 1, WorkspaceId: 1, ChatgptEmail: "old@gmail.com",
		Status: model.BusinessSubscriptionStatusRemoved, PrepaidThrough: 1, CurrentPriceVersionId: 1,
	}
	active := model.BusinessSeatSubscription{
		UserId: 42, ProductId: 1, WorkspaceId: 1, ChatgptEmail: "new@gmail.com",
		Status: model.BusinessSubscriptionStatusActive, PrepaidThrough: 2, CurrentPriceVersionId: 1,
	}
	require.NoError(t, model.DB.Create(&removed).Error)
	require.NoError(t, model.DB.Create(&active).Error)

	sub, err := model.GetBusinessSeatSubscriptionForUser(42)
	require.NoError(t, err)
	assert.Equal(t, active.Id, sub.Id)
	assert.Equal(t, model.BusinessSubscriptionStatusActive, sub.Status)

	open, err := model.HasOpenBusinessSeatSubscription(42)
	require.NoError(t, err)
	assert.True(t, open)
}

func TestQuoteExpiryRejected(t *testing.T) {
	setupBusinessSeatTestDB(t)
	quote := model.BusinessQuote{
		UserId: 1, WorkspaceId: 1, ProductId: 1, PriceVersionId: 1,
		ChatgptEmail: "x@gmail.com", QuoteType: model.BusinessQuoteTypeCycleStartFull,
		QuoteAt: 1, ExpiresAt: 2, Status: model.BusinessQuoteStatusPending,
		Currency: "CNY", TotalAmount: decimal.RequireFromString("199"),
	}
	require.NoError(t, model.DB.Create(&quote).Error)

	_, err := NewQuoteService().ValidateQuoteForOrder(quote.Id, 1)
	require.Error(t, err)
	assert.True(t, errors.Is(err, model.ErrBusinessQuoteExpired))
}

func TestSchedulerExpireIdempotent(t *testing.T) {
	setupBusinessSeatTestDB(t)
	sub := model.BusinessSeatSubscription{
		UserId: 7, ProductId: 1, WorkspaceId: 1, ChatgptEmail: "exp@gmail.com",
		Status: model.BusinessSubscriptionStatusActive, PrepaidThrough: 1, CurrentPriceVersionId: 1,
	}
	require.NoError(t, model.DB.Create(&sub).Error)
	seat := model.BusinessSeat{WorkspaceId: 1, SeatType: model.BusinessSeatTypeStandard, SeatNumber: 1, Status: model.BusinessSeatStatusActive, SubscriptionId: &sub.Id, UserId: &sub.UserId}
	require.NoError(t, model.DB.Create(&seat).Error)
	sub.SeatId = &seat.Id
	require.NoError(t, model.DB.Save(&sub).Error)

	svc := NewSubscriptionService()
	for i := 0; i < 10; i++ {
		require.NoError(t, svc.ExpireSubscription(sub.Id))
	}
	var taskCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ? AND subscription_id = ?", model.BusinessTaskTypeRemoveMember, sub.Id).Count(&taskCount).Error)
	assert.EqualValues(t, 1, taskCount)
}

func TestLifecycleMidCycleFullSeats(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	anchor := time.Date(2026, 10, 1, 0, 0, 0, 0, loc)
	ws, product, pv := seedWorkspaceWithSeats(t, 3, anchor)
	occupySeatsActive(t, ws.Id, 3, 1000, product.Id, pv.Id)

	quoteSvc := NewQuoteService()
	at := time.Date(2026, 10, 20, 12, 0, 0, 0, loc)
	result, err := quoteSvc.calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessQuoteTypeMidCycleProratedOnly, result.QuoteType)
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), result.PrepaidThrough)

	order := createPayingOrder(t, 5001, ws, product, pv, result.TotalAmount, result.PrepaidThrough)
	_, err = NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: order.OrderNo, ProviderTradeNo: "life-1", PaidAmount: result.TotalAmount,
		Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, err)

	var sub model.BusinessSeatSubscription
	require.NoError(t, model.DB.Where("user_id = ?", 5001).First(&sub).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusPendingCapacity, sub.Status)

	var addTask int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ? AND status = ?", model.BusinessTaskTypeAddSeat, model.BusinessTaskStatusOpen).Count(&addTask).Error)
	assert.EqualValues(t, 1, addTask)

	require.NoError(t, model.AddBusinessSeatsToWorkspace(ws.Id, 1))
	require.NoError(t, NewProvisioningService().ConfirmSeatAdded(1, ws.Id, sub.Id))

	require.NoError(t, model.DB.First(&sub, sub.Id).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusPendingActivation, sub.Status)

	require.NoError(t, NewSubscriptionService().MarkInvited(1, sub.Id))
	require.NoError(t, NewSubscriptionService().Activate(1, sub.Id))
	require.NoError(t, model.DB.First(&sub, sub.Id).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusActive, sub.Status)
	assert.Equal(t, result.PrepaidThrough, sub.PrepaidThrough)

	cycle, err := NewBillingCycleService().RenewalCycleWindow(ws, sub.PrepaidThrough)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), cycle.Start.Unix())
	assert.Equal(t, time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix(), cycle.End.Unix())

	require.NoError(t, NewSubscriptionService().ExpireSubscription(sub.Id))
	require.NoError(t, NewSubscriptionService().ConfirmRemoved(1, sub.Id))

	var available int64
	require.NoError(t, model.DB.Model(&model.BusinessSeat{}).Where("workspace_id = ? AND status = ?", ws.Id, model.BusinessSeatStatusAvailable).Count(&available).Error)
	assert.GreaterOrEqual(t, available, int64(1))
}

func TestLifecycleAvailableSeatNoAddTask(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 4, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	occupySeatsActive(t, ws.Id, 3, 2000, product.Id, pv.Id)

	quoteSvc := NewQuoteService()
	at := time.Date(2026, 10, 20, 12, 0, 0, 0, loc)
	result, err := quoteSvc.calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)

	order := createPayingOrder(t, 6001, ws, product, pv, result.TotalAmount, result.PrepaidThrough)
	_, err = NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: order.OrderNo, ProviderTradeNo: "avail-1", PaidAmount: result.TotalAmount,
		Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, err)

	var sub model.BusinessSeatSubscription
	require.NoError(t, model.DB.Where("user_id = ?", 6001).First(&sub).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusPendingActivation, sub.Status)

	var addTask int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).Where("task_type = ?", model.BusinessTaskTypeAddSeat).Count(&addTask).Error)
	assert.Zero(t, addTask)
}

func TestLifecycleCycleStartGrace(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, _, pv := seedWorkspaceWithSeats(t, 2, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	at := time.Date(2026, 10, 1, 0, 20, 0, 0, loc)
	result, err := NewQuoteService().calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessQuoteTypeCycleStartFull, result.QuoteType)
	assert.True(t, result.NextCycleAmount.Equal(decimal.RequireFromString("199.00")))
}

func TestPriceVersionSnapshotOnRenewal(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv1 := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	pv2 := &model.BusinessPriceVersion{
		ProductId: product.Id, PriceAmount: decimal.RequireFromString("229"), Currency: "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly, DisplayUnit: "/ month", EffectiveFrom: time.Now().Unix(), Enabled: true,
	}
	require.NoError(t, model.CreateBusinessPriceVersion(pv2))

	orderV1 := createPayingOrder(t, 7001, ws, product, pv1, decimal.RequireFromString("199.00"), time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix())
	orderV1.PriceVersionId = pv1.Id
	require.NoError(t, model.DB.Save(orderV1).Error)

	sub := model.BusinessSeatSubscription{
		UserId: 7001, ProductId: product.Id, WorkspaceId: ws.Id, ChatgptEmail: "v@gmail.com",
		Status: model.BusinessSubscriptionStatusActive, PrepaidThrough: time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(),
		CurrentPriceVersionId: pv1.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)
	renewalQuote, err := NewQuoteService().createRenewalQuoteAt(7001, sub.Id, time.Date(2026, 10, 29, 12, 0, 0, 0, loc))
	require.NoError(t, err)
	assert.Equal(t, pv2.Id, renewalQuote.PriceVersionId)
	assert.True(t, renewalQuote.TotalAmount.Equal(decimal.RequireFromString("229.00")))

	var stored model.BusinessSeatOrder
	require.NoError(t, model.DB.First(&stored, orderV1.Id).Error)
	assert.Equal(t, pv1.Id, stored.PriceVersionId)
}

func TestRenewalBeforeRemovalReactivates(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	sub := model.BusinessSeatSubscription{
		UserId: 8001, ProductId: product.Id, WorkspaceId: ws.Id, ChatgptEmail: "renew@gmail.com",
		Status: model.BusinessSubscriptionStatusPendingRemoval,
		PrepaidThrough: time.Now().Add(-time.Hour).Unix(), CurrentPriceVersionId: pv.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)
	seat := model.BusinessSeat{WorkspaceId: ws.Id, SeatType: model.BusinessSeatTypeStandard, SeatNumber: 1, Status: model.BusinessSeatStatusPendingRelease, SubscriptionId: &sub.Id, UserId: &sub.UserId}
	require.NoError(t, model.DB.Create(&seat).Error)
	sub.SeatId = &seat.Id
	require.NoError(t, model.DB.Save(&sub).Error)
	require.NoError(t, NewSubscriptionService().ExpireSubscription(sub.Id))

	renewOrder := createPayingOrder(t, 8001, ws, product, pv, decimal.RequireFromString("199.00"), time.Date(2027, 1, 1, 0, 0, 0, 0, loc).Unix())
	renewOrder.OrderType = model.BusinessOrderTypeRenewal
	renewOrder.SubscriptionId = &sub.Id
	require.NoError(t, model.DB.Save(renewOrder).Error)
	_, err := NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: renewOrder.OrderNo, ProviderTradeNo: "renew-before-remove", PaidAmount: decimal.RequireFromString("199.00"),
		Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, err)

	require.NoError(t, model.DB.First(&sub, sub.Id).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusActive, sub.Status)
	require.NoError(t, model.DB.First(&seat, seat.Id).Error)
	assert.Equal(t, model.BusinessSeatStatusActive, seat.Status)
}

func TestReconciliationCleanAfterLifecycle(t *testing.T) {
	setupBusinessSeatTestDB(t)
	issues := NewReconciliationService().RunChecks()
	for _, issue := range issues {
		assert.NotContains(t, issue.Code, "PAID_ORDER_NO_SUBSCRIPTION")
	}
}

func TestFeatureFlagDisablesSales(t *testing.T) {
	prev := setting.BusinessSeatEnabled
	setting.BusinessSeatEnabled = false
	t.Cleanup(func() { setting.BusinessSeatEnabled = prev })
	assert.False(t, setting.IsBusinessSeatSalesEnabled())
}

func TestTaskIdempotencyDuplicateAddSeat(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 3, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	occupySeatsActive(t, ws.Id, 3, 100, product.Id, pv.Id)

	order := createPayingOrder(t, 2001, ws, product, pv, decimal.RequireFromString("300.00"), time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix())
	for i := 0; i < 3; i++ {
		_, err := NewProvisioningService().ProcessPayment(PaymentConfirmInput{
			OrderNo: order.OrderNo, ProviderTradeNo: "idem-add-seat", PaidAmount: order.TotalAmount,
			Currency: "CNY", PaymentChannel: "alipay",
		})
		require.NoError(t, err)
	}
	var sub model.BusinessSeatSubscription
	require.NoError(t, model.DB.Where("user_id = ?", 2001).First(&sub).Error)
	require.Equal(t, model.BusinessSubscriptionStatusPendingCapacity, sub.Status)

	var openTasks int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).
		Where("subscription_id = ? AND task_type = ? AND status = ?", sub.Id, model.BusinessTaskTypeAddSeat, model.BusinessTaskStatusOpen).
		Count(&openTasks).Error)
	assert.EqualValues(t, 1, openTasks)
}

func TestMarkInvitedAfterActivateCompletesInviteTask(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	order := createPayingOrder(t, 3001, ws, product, pv, decimal.RequireFromString("30.00"), time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix())
	_, err := NewProvisioningService().ProcessPayment(PaymentConfirmInput{
		OrderNo: order.OrderNo, ProviderTradeNo: "mark-after-activate", PaidAmount: order.TotalAmount,
		Currency: "CNY", PaymentChannel: "alipay",
	})
	require.NoError(t, err)

	var sub model.BusinessSeatSubscription
	require.NoError(t, model.DB.Where("user_id = ?", 3001).First(&sub).Error)
	require.NoError(t, NewSubscriptionService().Activate(1, sub.Id))

	task := model.BusinessSeatTask{
		TaskType:       model.BusinessTaskTypeInviteMember,
		Status:         model.BusinessTaskStatusOpen,
		WorkspaceId:    ws.Id,
		SubscriptionId: &sub.Id,
		Payload:        sub.ChatgptEmail,
	}
	require.NoError(t, model.DB.Create(&task).Error)

	require.NoError(t, NewSubscriptionService().MarkInvited(1, sub.Id))

	var storedTask model.BusinessSeatTask
	require.NoError(t, model.DB.First(&storedTask, task.Id).Error)
	assert.Equal(t, model.BusinessTaskStatusDone, storedTask.Status)

	require.NoError(t, model.DB.First(&sub, sub.Id).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusActive, sub.Status)
}
