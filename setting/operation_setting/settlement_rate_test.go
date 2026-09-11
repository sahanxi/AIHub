package operation_setting

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetTopUpSettlementUnitPriceUsesUsdExchangeRateForUSD(t *testing.T) {
	originalDisplay := generalSetting.QuotaDisplayType
	originalFX := USDExchangeRate
	originalPrice := Price
	t.Cleanup(func() {
		generalSetting.QuotaDisplayType = originalDisplay
		USDExchangeRate = originalFX
		Price = originalPrice
	})

	generalSetting.QuotaDisplayType = QuotaDisplayTypeUSD
	USDExchangeRate = 6.8
	Price = 1
	assert.InDelta(t, 6.8, GetTopUpSettlementUnitPrice(), 0.0001)

	generalSetting.QuotaDisplayType = QuotaDisplayTypeCNY
	assert.Equal(t, float64(1), GetTopUpSettlementUnitPrice())
}

func TestConvertAmountToCNY(t *testing.T) {
	originalFX := USDExchangeRate
	t.Cleanup(func() { USDExchangeRate = originalFX })
	USDExchangeRate = 6.8

	cny, err := ConvertAmountToCNY(decimal.RequireFromString("10"), "USD")
	require.NoError(t, err)
	assert.True(t, cny.Equal(decimal.RequireFromString("68")))

	passthrough, err := ConvertAmountToCNY(decimal.RequireFromString("197.08"), "CNY")
	require.NoError(t, err)
	assert.True(t, passthrough.Equal(decimal.RequireFromString("197.08")))
}
