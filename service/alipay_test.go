package service

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/setting"
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

func TestCloseAlipayTradeTreatsClosedAndNotCreatedTransactionsAsSuccess(t *testing.T) {
	privatePEM, publicPEM := mustAlipayTestKeyPair(t)
	responses := []string{
		`{"code":"10000","msg":"Success","out_trade_no":"ORDER-1"}`,
		`{"code":"40004","msg":"Business Failed","sub_code":"ACQ.TRADE_NOT_EXIST","sub_msg":"Trade does not exist"}`,
	}
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, AlipayMethodTradeClose, r.URL.Query().Get("method"))
		require.Contains(t, r.URL.Query().Get("biz_content"), `"out_trade_no":"ORDER-1"`)
		responseNode := responses[requestCount]
		requestCount++
		signature := mustSignAlipayRaw(t, privatePEM, responseNode)
		w.Header().Set("Content-Type", "application/json")
		_, err := fmt.Fprintf(w, `{"alipay_trade_close_response":%s,"sign":%q}`, responseNode, signature)
		require.NoError(t, err)
	}))
	t.Cleanup(server.Close)

	originalGateway := setting.AlipayGateway
	originalAppID := setting.AlipayAppId
	originalPrivateKey := setting.AlipayPrivateKey
	originalPublicKey := setting.AlipayPublicKey
	t.Cleanup(func() {
		setting.AlipayGateway = originalGateway
		setting.AlipayAppId = originalAppID
		setting.AlipayPrivateKey = originalPrivateKey
		setting.AlipayPublicKey = originalPublicKey
	})
	setting.AlipayGateway = server.URL
	setting.AlipayAppId = "app-1"
	setting.AlipayPrivateKey = privatePEM
	setting.AlipayPublicKey = publicPEM

	require.NoError(t, CloseAlipayTrade(context.Background(), "ORDER-1"))
	require.NoError(t, CloseAlipayTrade(context.Background(), "ORDER-1"))
	require.Equal(t, 2, requestCount)
}

func TestCloseAlipayTradeRejectsProviderFailure(t *testing.T) {
	privatePEM, publicPEM := mustAlipayTestKeyPair(t)
	responseNode := `{"code":"40004","msg":"Business Failed","sub_code":"ACQ.TRADE_STATUS_ERROR","sub_msg":"Trade status is invalid"}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		signature := mustSignAlipayRaw(t, privatePEM, responseNode)
		_, err := fmt.Fprintf(w, `{"alipay_trade_close_response":%s,"sign":%q}`, responseNode, signature)
		require.NoError(t, err)
	}))
	t.Cleanup(server.Close)

	originalGateway := setting.AlipayGateway
	originalAppID := setting.AlipayAppId
	originalPrivateKey := setting.AlipayPrivateKey
	originalPublicKey := setting.AlipayPublicKey
	t.Cleanup(func() {
		setting.AlipayGateway = originalGateway
		setting.AlipayAppId = originalAppID
		setting.AlipayPrivateKey = originalPrivateKey
		setting.AlipayPublicKey = originalPublicKey
	})
	setting.AlipayGateway = server.URL
	setting.AlipayAppId = "app-1"
	setting.AlipayPrivateKey = privatePEM
	setting.AlipayPublicKey = publicPEM

	err := CloseAlipayTrade(context.Background(), "ORDER-2")
	require.ErrorContains(t, err, "ACQ.TRADE_STATUS_ERROR")
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

func mustSignAlipayRaw(t *testing.T, privatePEM, content string) string {
	t.Helper()
	key, err := parseRSAPrivateKey(privatePEM)
	require.NoError(t, err)
	digest := sha256.Sum256([]byte(content))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	require.NoError(t, err)
	return base64.StdEncoding.EncodeToString(signature)
}
