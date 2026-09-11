package businessseat

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testWorkspaceOct1() *model.BusinessWorkspace {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	anchor := time.Date(2026, 10, 1, 0, 0, 0, 0, loc)
	return &model.BusinessWorkspace{
		Id:                     1,
		BillingCadence:         model.BusinessBillingCadenceMonthly,
		BillingAnchorAt:        anchor.Unix(),
		BillingTimezone:        "Asia/Shanghai",
		CycleStartGraceMinutes: 60,
		RenewalLeadDays:        DefaultRenewalLeadDays,
	}
}

func TestGetCurrentCycleOctober(t *testing.T) {
	svc := NewBillingCycleService()
	ws := testWorkspaceOct1()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	at := time.Date(2026, 10, 20, 12, 0, 0, 0, loc)

	cycle, err := svc.GetCurrentCycle(ws, at)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 10, 1, 0, 0, 0, 0, loc), cycle.Start)
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc), cycle.End)
}

func TestMidCycleProrationRatio(t *testing.T) {
	svc := NewBillingCycleService()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	start := time.Date(2026, 10, 1, 0, 0, 0, 0, loc)
	end := time.Date(2026, 11, 1, 0, 0, 0, 0, loc)
	at := time.Date(2026, 10, 20, 0, 0, 0, 0, loc)

	ratio := svc.CalculateRemainingRatio(start, end, at)
	total := end.Sub(start)
	remaining := end.Sub(at)
	expected := decimal.NewFromInt(remaining.Nanoseconds()).Div(decimal.NewFromInt(total.Nanoseconds()))
	assert.True(t, ratio.Sub(expected).Abs().LessThan(decimal.RequireFromString("0.0001")))
}

func TestCycleStartGraceWindow(t *testing.T) {
	svc := NewBillingCycleService()
	ws := testWorkspaceOct1()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	cycleStart := time.Date(2026, 10, 1, 0, 0, 0, 0, loc)
	at := time.Date(2026, 10, 1, 0, 30, 0, 0, loc)
	assert.True(t, svc.IsWithinCycleStartGraceWindow(ws, at, cycleStart))
}

func TestInitialQuoteMidCycle(t *testing.T) {
	svc := NewQuoteService()
	ws := testWorkspaceOct1()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	at := time.Date(2026, 10, 20, 12, 0, 0, 0, loc)
	price := decimal.RequireFromString("199")
	pv := &model.BusinessPriceVersion{
		Id:             1,
		PriceAmount:    price,
		Currency:       "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly,
	}

	result, err := svc.calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessQuoteTypeMidCycleProratedOnly, result.QuoteType)
	assert.True(t, result.CurrentCycleAmount.GreaterThan(decimal.Zero))
	assert.True(t, result.NextCycleAmount.Equal(decimal.RequireFromString("199.00")))
	assert.True(t, result.TotalAmount.Equal(result.CurrentCycleAmount))
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), result.PrepaidThrough)
	assert.Equal(t, time.Date(2026, 10, 29, 0, 0, 0, 0, loc).Unix(), result.RenewalWindowOpensAt)
}

func TestInitialQuoteCycleStart(t *testing.T) {
	svc := NewQuoteService()
	ws := testWorkspaceOct1()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	at := time.Date(2026, 10, 1, 0, 15, 0, 0, loc)
	price := decimal.RequireFromString("199")
	pv := &model.BusinessPriceVersion{
		Id:             1,
		PriceAmount:    price,
		Currency:       "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly,
	}

	result, err := svc.calculateInitialQuote(ws, pv, at)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessQuoteTypeCycleStartFull, result.QuoteType)
	assert.True(t, result.NextCycleAmount.Equal(decimal.RequireFromString("199.00")))
	assert.True(t, result.TotalAmount.Equal(decimal.RequireFromString("199.00")))
	assert.Equal(t, time.Date(2026, 11, 1, 0, 0, 0, 0, loc).Unix(), result.PrepaidThrough)
}

func TestFebruaryMonthLength(t *testing.T) {
	svc := NewBillingCycleService()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	anchor := time.Date(2026, 1, 31, 0, 0, 0, 0, loc)
	ws := &model.BusinessWorkspace{
		BillingCadence:  model.BusinessBillingCadenceMonthly,
		BillingAnchorAt: anchor.Unix(),
		BillingTimezone: "Asia/Shanghai",
	}
	at := time.Date(2026, 2, 15, 0, 0, 0, 0, loc)
	cycle, err := svc.GetCurrentCycle(ws, at)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 1, 31, 0, 0, 0, 0, loc), cycle.Start)
	assert.Equal(t, time.Date(2026, 2, 28, 0, 0, 0, 0, loc), cycle.End)
}

func TestRenewalCycleFromPrepaidThrough(t *testing.T) {
	svc := NewBillingCycleService()
	ws := testWorkspaceOct1()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	prepaidThrough := time.Date(2026, 12, 1, 0, 0, 0, 0, loc).Unix()
	cycle, err := svc.RenewalCycleWindow(ws, prepaidThrough)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 12, 1, 0, 0, 0, 0, loc), cycle.Start)
	assert.Equal(t, time.Date(2027, 1, 1, 0, 0, 0, 0, loc), cycle.End)
}
