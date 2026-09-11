package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveAlipayWalletNotifyURLUsesExplicitConfig(t *testing.T) {
	originalWallet := AlipayNotifyURL
	originalBusiness := AlipayBusinessSeatNotifyURL
	t.Cleanup(func() {
		AlipayNotifyURL = originalWallet
		AlipayBusinessSeatNotifyURL = originalBusiness
	})

	AlipayNotifyURL = "https://pay.example.com/api/payment/alipay/notify"
	AlipayBusinessSeatNotifyURL = "https://pay.example.com/api/payment/business-seat/alipay/notify"

	got := ResolveAlipayWalletNotifyURL("https://fallback.example.com")
	require.Equal(t, AlipayNotifyURL, got)
}

func TestResolveAlipayBusinessSeatNotifyURLUsesExplicitConfig(t *testing.T) {
	originalWallet := AlipayNotifyURL
	originalBusiness := AlipayBusinessSeatNotifyURL
	t.Cleanup(func() {
		AlipayNotifyURL = originalWallet
		AlipayBusinessSeatNotifyURL = originalBusiness
	})

	AlipayNotifyURL = "https://pay.example.com/api/payment/alipay/notify"
	AlipayBusinessSeatNotifyURL = "https://pay.example.com/api/payment/business-seat/alipay/notify"

	got := ResolveAlipayBusinessSeatNotifyURL("https://fallback.example.com")
	require.Equal(t, AlipayBusinessSeatNotifyURL, got)
}

func TestResolveAlipayBusinessSeatNotifyURLFallbackDoesNotUseWalletURL(t *testing.T) {
	originalWallet := AlipayNotifyURL
	originalBusiness := AlipayBusinessSeatNotifyURL
	t.Cleanup(func() {
		AlipayNotifyURL = originalWallet
		AlipayBusinessSeatNotifyURL = originalBusiness
	})

	AlipayNotifyURL = "https://pay.example.com/api/payment/alipay/notify"
	AlipayBusinessSeatNotifyURL = ""

	got := ResolveAlipayBusinessSeatNotifyURL("https://cb.example.com")
	require.Equal(t, "https://cb.example.com/api/payment/business-seat/alipay/notify", got)
	assert.NotEqual(t, AlipayNotifyURL, got)
}

func TestResolveAlipayBusinessSeatNotifyURLFallbackTrimsCallbackSlash(t *testing.T) {
	originalBusiness := AlipayBusinessSeatNotifyURL
	t.Cleanup(func() { AlipayBusinessSeatNotifyURL = originalBusiness })
	AlipayBusinessSeatNotifyURL = ""

	got := ResolveAlipayBusinessSeatNotifyURL("https://cb.example.com/")
	require.Equal(t, "https://cb.example.com/api/payment/business-seat/alipay/notify", got)
}

func TestAlipayNotifyURLConfigIsolation(t *testing.T) {
	originalWallet := AlipayNotifyURL
	originalBusiness := AlipayBusinessSeatNotifyURL
	t.Cleanup(func() {
		AlipayNotifyURL = originalWallet
		AlipayBusinessSeatNotifyURL = originalBusiness
	})

	AlipayNotifyURL = "https://pay.example.com/A"
	AlipayBusinessSeatNotifyURL = "https://pay.example.com/B"
	require.Equal(t, "https://pay.example.com/A", ResolveAlipayWalletNotifyURL("https://ignored.example.com"))
	require.Equal(t, "https://pay.example.com/B", ResolveAlipayBusinessSeatNotifyURL("https://ignored.example.com"))

	AlipayNotifyURL = "https://pay.example.com/C"
	require.Equal(t, "https://pay.example.com/C", ResolveAlipayWalletNotifyURL("https://ignored.example.com"))
	require.Equal(t, "https://pay.example.com/B", ResolveAlipayBusinessSeatNotifyURL("https://ignored.example.com"))
}
