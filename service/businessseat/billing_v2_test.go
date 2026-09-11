package businessseat

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMidCycleProrationOnlyExample(t *testing.T) {
	svc := NewQuoteService()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws := &model.BusinessWorkspace{
		BillingCadence:  model.BusinessBillingCadenceMonthly,
		BillingAnchorAt: time.Date(2026, 10, 1, 0, 0, 0, 0, loc).Unix(),
		BillingTimezone: "Asia/Shanghai",
		RenewalLeadDays: 3,
	}
	pv := &model.BusinessPriceVersion{
		PriceAmount:    decimal.RequireFromString("200"),
		Currency:       "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly,
	}
	at := time.Date(2026, 10, 20, 0, 0, 0, 0, loc)

	result, err := svc.calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessQuoteTypeMidCycleProratedOnly, result.QuoteType)
	assert.True(t, result.TotalAmount.Equal(decimal.RequireFromString("77.42")))
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), result.PrepaidThrough)
	assert.Equal(t, time.Date(2026, 10, 29, 0, 0, 0, 0, loc).Unix(), result.RenewalWindowOpensAt)
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), result.RenewalPaymentDeadlineAt)
}

func TestRenewalWindowNotOpenBeforeLeadDays(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	ws.RenewalLeadDays = 3
	require.NoError(t, model.DB.Model(ws).Update("renewal_lead_days", 3).Error)

	sub := model.BusinessSeatSubscription{
		UserId: 9001, ProductId: product.Id, WorkspaceId: ws.Id, ChatgptEmail: "lead@gmail.com",
		Status: model.BusinessSubscriptionStatusActive,
		PrepaidThrough: time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(),
		CurrentPriceVersionId: pv.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)

	now := time.Date(2026, 10, 28, 23, 59, 0, 0, loc)
	order, err := NewRenewalService().EnsureRenewalOrder(&sub, ws, now)
	require.NoError(t, err)
	assert.Nil(t, order)
}

func TestRenewalWindowOpensCreatesSingleOrder(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	require.NoError(t, model.DB.Model(ws).Update("renewal_lead_days", 3).Error)
	require.NoError(t, model.DB.First(ws, ws.Id).Error)

	sub := model.BusinessSeatSubscription{
		UserId: 9002, ProductId: product.Id, WorkspaceId: ws.Id, ChatgptEmail: "renew@gmail.com",
		Status: model.BusinessSubscriptionStatusActive,
		PrepaidThrough: time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(),
		CurrentPriceVersionId: pv.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)

	renewalSvc := NewRenewalService()
	now := time.Date(2026, 10, 29, 0, 5, 0, 0, loc)
	for i := 0; i < 20; i++ {
		_, err := renewalSvc.EnsureRenewalOrder(&sub, ws, now)
		require.NoError(t, err)
	}

	var orderCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatOrder{}).
		Where("subscription_id = ? AND order_type = ?", sub.Id, model.BusinessOrderTypeRenewal).
		Count(&orderCount).Error)
	assert.EqualValues(t, 1, orderCount)
}

func TestLegacyPrepayDoesNotDuplicateRenewal(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	require.NoError(t, model.DB.Model(ws).Update("renewal_lead_days", 3).Error)

	sub := model.BusinessSeatSubscription{
		UserId: 9003, ProductId: product.Id, WorkspaceId: ws.Id, ChatgptEmail: "legacy@gmail.com",
		Status: model.BusinessSubscriptionStatusActive,
		PrepaidThrough: time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix(),
		CurrentPriceVersionId: pv.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)

	now := time.Date(2026, 10, 29, 0, 0, 0, 0, loc)
	order, err := NewRenewalService().EnsureRenewalOrder(&sub, ws, now)
	require.NoError(t, err)
	assert.Nil(t, order)

	timing, err := NewBillingCycleService().RenewalTiming(ws, sub.PrepaidThrough)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 11, 28, 0, 0, 0, 0, loc).Unix(), timing.RenewalWindowOpensAt)
}

func TestRenewalLeadDaysValidation(t *testing.T) {
	assert.NoError(t, ValidateRenewalLeadDays(0))
	assert.NoError(t, ValidateRenewalLeadDays(3))
	assert.NoError(t, ValidateRenewalLeadDays(14))
	assert.Error(t, ValidateRenewalLeadDays(-1))
	assert.Error(t, ValidateRenewalLeadDays(15))
}

func TestExpiringMarkDoesNotTriggerRemoval(t *testing.T) {
	setupBusinessSeatTestDB(t)
	loc, _ := time.LoadLocation("Asia/Shanghai")
	ws, product, pv := seedWorkspaceWithSeats(t, 1, time.Date(2026, 10, 1, 0, 0, 0, 0, loc))
	require.NoError(t, model.DB.Model(ws).Update("renewal_lead_days", 3).Error)

	seat := model.BusinessSeat{
		WorkspaceId: ws.Id, SeatType: model.BusinessSeatTypeStandard, SeatNumber: 1,
		Status: model.BusinessSeatStatusActive,
	}
	require.NoError(t, model.DB.Create(&seat).Error)
	userId := 9010
	seatId := seat.Id
	sub := model.BusinessSeatSubscription{
		UserId: userId, ProductId: product.Id, WorkspaceId: ws.Id, SeatId: &seatId,
		ChatgptEmail: "expiring@gmail.com", Status: model.BusinessSubscriptionStatusActive,
		PrepaidThrough: time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(),
		CurrentPriceVersionId: pv.Id,
	}
	require.NoError(t, model.DB.Create(&sub).Error)
	seat.SubscriptionId = &sub.Id
	seat.UserId = &userId
	require.NoError(t, model.DB.Save(&seat).Error)

	now := time.Date(2026, 10, 29, 12, 0, 0, 0, loc)
	require.NoError(t, NewRenewalService().MarkExpiringSubscriptions(now))

	require.NoError(t, model.DB.First(&sub, sub.Id).Error)
	assert.Equal(t, model.BusinessSubscriptionStatusExpiring, sub.Status)
	require.NoError(t, model.DB.First(&seat, seat.Id).Error)
	assert.Equal(t, model.BusinessSeatStatusActive, seat.Status)

	var removalTasks int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatTask{}).
		Where("subscription_id = ? AND task_type = ?", sub.Id, model.BusinessTaskTypeRemoveMember).
		Count(&removalTasks).Error)
	assert.EqualValues(t, 0, removalTasks)
}

func TestMidCycleOrderItemsExcludePrepay(t *testing.T) {
	quote := &model.BusinessQuote{
		QuoteType:          model.BusinessQuoteTypeMidCycleProratedOnly,
		QuoteAt:            time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC).Unix(),
		CycleEndAt:         time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC).Unix(),
		CurrentCycleAmount: decimal.RequireFromString("77.42"),
		Currency:           "CNY",
	}
	items := buildOrderItemsFromQuote(quote, 1)
	require.Len(t, items, 1)
	assert.Equal(t, model.BusinessOrderItemCurrentCycleProration, items[0].ItemType)
}
