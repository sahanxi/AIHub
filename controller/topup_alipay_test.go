package controller

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestAlipayNotifyRejectsWhenDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	originalAppID := setting.AlipayAppId
	originalPrivate := setting.AlipayPrivateKey
	originalPublic := setting.AlipayPublicKey
	t.Cleanup(func() {
		setting.AlipayAppId = originalAppID
		setting.AlipayPrivateKey = originalPrivate
		setting.AlipayPublicKey = originalPublic
	})
	setting.AlipayAppId = ""
	setting.AlipayPrivateKey = ""
	setting.AlipayPublicKey = ""

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/payment/alipay/notify", strings.NewReader("out_trade_no=missing"))
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	AlipayNotify(ctx)
	require.Equal(t, "fail", recorder.Body.String())
}

func TestAlipayNotifyRejectsBadSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	confirmPaymentComplianceForTest(t)
	originalAppID := setting.AlipayAppId
	originalPrivate := setting.AlipayPrivateKey
	originalPublic := setting.AlipayPublicKey
	originalPayMethods := operation_setting.PayMethods
	t.Cleanup(func() {
		setting.AlipayAppId = originalAppID
		setting.AlipayPrivateKey = originalPrivate
		setting.AlipayPublicKey = originalPublic
		operation_setting.PayMethods = originalPayMethods
	})
	_, publicPEM := mustControllerAlipayKeyPair(t)
	setting.AlipayAppId = "2021006196609625"
	setting.AlipayPrivateKey = "unused"
	setting.AlipayPublicKey = publicPEM
	operation_setting.PayMethods = []map[string]string{{"type": "alipay"}}
	require.True(t, isAlipayWebhookEnabled())

	form := url.Values{}
	form.Set("app_id", setting.AlipayAppId)
	form.Set("out_trade_no", "USR1NOabc")
	form.Set("total_amount", "1.00")
	form.Set("trade_status", service.AlipayTradeSuccess)
	form.Set("sign_type", "RSA2")
	form.Set("sign", "not-a-valid-signature")

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/payment/alipay/notify", strings.NewReader(form.Encode()))
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	AlipayNotify(ctx)
	require.Equal(t, "fail", recorder.Body.String())
}

func TestIsAlipayMobileRequest(t *testing.T) {
	t.Parallel()
	require.True(t, isAlipayMobileRequest("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"))
	require.False(t, isAlipayMobileRequest("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"))
}

func mustControllerAlipayKeyPair(t *testing.T) (string, string) {
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
