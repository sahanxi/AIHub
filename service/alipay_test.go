package service

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAlipayRequestSignAndNotifyVerify(t *testing.T) {
	t.Parallel()

	privatePEM, publicPEM := mustAlipayTestKeyPair(t)
	params := map[string]string{
		"app_id":      "2021006196609625",
		"biz_content": `{"out_trade_no":"USR1NOabc123","total_amount":"1.00"}`,
		"charset":     "utf-8",
		"method":      AlipayMethodPagePay,
		"sign_type":   "RSA2",
		"timestamp":   "2026-09-07 22:00:00",
		"version":     "1.0",
	}
	sign, err := SignAlipayRequest(privatePEM, params)
	require.NoError(t, err)
	require.NotEmpty(t, sign)

	notify := map[string]string{
		"app_id":       "2021006196609625",
		"out_trade_no": "USR1NOabc123",
		"total_amount": "1.00",
		"trade_status": AlipayTradeSuccess,
		"sign_type":    "RSA2",
		"sign": mustSignAlipayNotify(t, privatePEM, map[string]string{
			"app_id":       "2021006196609625",
			"out_trade_no": "USR1NOabc123",
			"total_amount": "1.00",
			"trade_status": AlipayTradeSuccess,
		}),
	}
	require.NoError(t, VerifyAlipayNotification(publicPEM, notify))

	notify["total_amount"] = "0.01"
	require.Error(t, VerifyAlipayNotification(publicPEM, notify))
}

func TestAlipayTradePaid(t *testing.T) {
	t.Parallel()
	require.True(t, AlipayTradePaid(AlipayTradeSuccess))
	require.True(t, AlipayTradePaid(AlipayTradeFinished))
	require.False(t, AlipayTradePaid("WAIT_BUYER_PAY"))
	require.False(t, AlipayTradePaid(""))
}

func TestParseAlipayOneLineKeys(t *testing.T) {
	t.Parallel()
	privatePEM, publicPEM := mustAlipayTestKeyPair(t)
	privateOneLine := stripPEM(privatePEM)
	publicOneLine := stripPEM(publicPEM)

	sign, err := SignAlipayRequest(privateOneLine, map[string]string{"app_id": "1"})
	require.NoError(t, err)
	require.NoError(t, VerifyAlipayNotification(publicOneLine, map[string]string{
		"app_id":    "1",
		"sign_type": "RSA2",
		"sign":      sign,
	}))
}

func mustAlipayTestKeyPair(t *testing.T) (string, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	privateDER, err := x509.MarshalPKCS8PrivateKey(key)
	require.NoError(t, err)
	publicDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	require.NoError(t, err)
	privatePEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privateDER})
	publicPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: publicDER})
	return string(privatePEM), string(publicPEM)
}

func mustSignAlipayNotify(t *testing.T, privatePEM string, params map[string]string) string {
	t.Helper()
	sign, err := SignAlipayRequest(privatePEM, params)
	require.NoError(t, err)
	return sign
}

func stripPEM(raw string) string {
	block, _ := pem.Decode([]byte(raw))
	if block == nil {
		return raw
	}
	return base64.StdEncoding.EncodeToString(block.Bytes)
}
