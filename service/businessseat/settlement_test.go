package businessseat

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettleForAlipayConvertsUSDWithSiteRate(t *testing.T) {
	original := operation_setting.USDExchangeRate
	t.Cleanup(func() { operation_setting.USDExchangeRate = original })
	operation_setting.USDExchangeRate = 6.8

	amount, currency, err := SettleForAlipay(decimal.RequireFromString("10.00"), "USD")
	require.NoError(t, err)
	assert.Equal(t, "CNY", currency)
	assert.True(t, amount.Equal(decimal.RequireFromString("68.00")))

	passthrough, currency, err := SettleForAlipay(decimal.RequireFromString("197.08"), "CNY")
	require.NoError(t, err)
	assert.Equal(t, "CNY", currency)
	assert.True(t, passthrough.Equal(decimal.RequireFromString("197.08")))
}
