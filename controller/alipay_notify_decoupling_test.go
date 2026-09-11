package controller

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func alipayNotifyURLFromCheckout(t *testing.T, checkoutURL string) string {
	t.Helper()
	parsed, err := url.Parse(checkoutURL)
	require.NoError(t, err)
	return parsed.Query().Get("notify_url")
}

func withAlipayCheckoutTestConfig(t *testing.T) (privatePEM, publicPEM string) {
	t.Helper()
	confirmPaymentComplianceForTest(t)
	privatePEM, publicPEM = mustControllerAlipayKeyPair(t)

	originalAppID := setting.AlipayAppId
	originalPrivate := setting.AlipayPrivateKey
	originalPublic := setting.AlipayPublicKey
	originalGateway := setting.AlipayGateway
	originalWalletNotify := setting.AlipayNotifyURL
	originalBusinessNotify := setting.AlipayBusinessSeatNotifyURL
	originalServerAddress := system_setting.ServerAddress
	originalCallback := operation_setting.CustomCallbackAddress
	originalPayMethods := operation_setting.PayMethods
	t.Cleanup(func() {
		setting.AlipayAppId = originalAppID
		setting.AlipayPrivateKey = originalPrivate
		setting.AlipayPublicKey = originalPublic
		setting.AlipayGateway = originalGateway
		setting.AlipayNotifyURL = originalWalletNotify
		setting.AlipayBusinessSeatNotifyURL = originalBusinessNotify
		system_setting.ServerAddress = originalServerAddress
		operation_setting.CustomCallbackAddress = originalCallback
		operation_setting.PayMethods = originalPayMethods
	})

	setting.AlipayAppId = "2021006196609625"
	setting.AlipayPrivateKey = privatePEM
	setting.AlipayPublicKey = publicPEM
	setting.AlipayGateway = "https://openapi.alipay.com/gateway.do"
	operation_setting.PayMethods = []map[string]string{{"type": "alipay"}}
	system_setting.ServerAddress = "https://cb.example.com"
	operation_setting.CustomCallbackAddress = ""
	return privatePEM, publicPEM
}

func TestWalletCheckoutUsesWalletNotifyURL(t *testing.T) {
	_, _ = withAlipayCheckoutTestConfig(t)
	setting.AlipayNotifyURL = "https://aihub.xzsmart.top/api/payment/alipay/notify"
	setting.AlipayBusinessSeatNotifyURL = "https://aihub.xzsmart.top/api/payment/business-seat/alipay/notify"

	notifyURL := setting.ResolveAlipayWalletNotifyURL(service.GetCallbackAddress())
	checkoutURL, err := service.BuildAlipayCheckoutURL(service.AlipayPagePayArgs{
		OutTradeNo:  "USR1NOwallet01",
		Subject:     "wallet top-up",
		TotalAmount: "1.00",
		NotifyURL:   notifyURL,
		ReturnURL:   "https://aihub.xzsmart.top/wallet",
	})
	require.NoError(t, err)
	require.Equal(t, "https://aihub.xzsmart.top/api/payment/alipay/notify", alipayNotifyURLFromCheckout(t, checkoutURL))
}

func TestBusinessSeatCheckoutUsesBusinessSeatNotifyURL(t *testing.T) {
	_, _ = withAlipayCheckoutTestConfig(t)
	setting.AlipayNotifyURL = "https://aihub.xzsmart.top/api/payment/alipay/notify"
	setting.AlipayBusinessSeatNotifyURL = "https://aihub.xzsmart.top/api/payment/business-seat/alipay/notify"

	notifyURL := setting.ResolveAlipayBusinessSeatNotifyURL(service.GetCallbackAddress())
	checkoutURL, err := service.BuildAlipayCheckoutURL(service.AlipayPagePayArgs{
		OutTradeNo:  model.GenerateBusinessSeatOrderNo(42),
		Subject:     "business seat",
		TotalAmount: "100.00",
		NotifyURL:   notifyURL,
		ReturnURL:   "https://aihub.xzsmart.top/chatgpt-business",
	})
	require.NoError(t, err)
	require.Equal(t, "https://aihub.xzsmart.top/api/payment/business-seat/alipay/notify", alipayNotifyURLFromCheckout(t, checkoutURL))
}

func TestBusinessSeatCheckoutFallbackDoesNotUseWalletNotifyURL(t *testing.T) {
	_, _ = withAlipayCheckoutTestConfig(t)
	setting.AlipayNotifyURL = "https://aihub.xzsmart.top/api/payment/alipay/notify"
	setting.AlipayBusinessSeatNotifyURL = ""

	notifyURL := setting.ResolveAlipayBusinessSeatNotifyURL(service.GetCallbackAddress())
	checkoutURL, err := service.BuildAlipayCheckoutURL(service.AlipayPagePayArgs{
		OutTradeNo:  model.GenerateBusinessSeatOrderNo(7),
		Subject:     "business seat",
		TotalAmount: "100.00",
		NotifyURL:   notifyURL,
		ReturnURL:   "https://cb.example.com/chatgpt-business",
	})
	require.NoError(t, err)
	got := alipayNotifyURLFromCheckout(t, checkoutURL)
	require.Equal(t, "https://cb.example.com/api/payment/business-seat/alipay/notify", got)
	assert.NotEqual(t, setting.AlipayNotifyURL, got)
}

func setupAlipayNotifyIsolationDB(t *testing.T) {
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
		&model.User{},
		&model.TopUp{},
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
}

func signedAlipayNotifyForm(t *testing.T, privatePEM string, tradeNo string, amount string) url.Values {
	t.Helper()
	form := url.Values{}
	form.Set("app_id", setting.AlipayAppId)
	form.Set("out_trade_no", tradeNo)
	form.Set("total_amount", amount)
	form.Set("trade_status", service.AlipayTradeSuccess)
	form.Set("trade_no", "provider-trade-1")
	form.Set("sign_type", "RSA2")
	sign, err := service.SignAlipayRequest(privatePEM, map[string]string{
		"app_id":       setting.AlipayAppId,
		"out_trade_no": tradeNo,
		"total_amount": amount,
		"trade_status": service.AlipayTradeSuccess,
		"trade_no":     "provider-trade-1",
	})
	require.NoError(t, err)
	form.Set("sign", sign)
	return form
}

func postAlipayNotify(t *testing.T, handler func(*gin.Context), form url.Values) string {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/notify", strings.NewReader(form.Encode()))
	ctx.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	handler(ctx)
	return recorder.Body.String()
}

func seedBusinessSeatPayingOrder(t *testing.T, tradeNo string, amount decimal.Decimal) {
	t.Helper()
	ws := &model.BusinessWorkspace{
		Name: "Notify WS", Provider: model.BusinessWorkspaceProviderOpenAI,
		WorkspaceType: model.BusinessWorkspaceTypeChatGPTBusiness, Status: model.BusinessWorkspaceStatusActive,
		BillingCadence: model.BusinessBillingCadenceMonthly, BillingAnchorAt: time.Now().Unix(),
		BillingTimezone: "Asia/Shanghai", TotalStandardSeats: 1,
	}
	require.NoError(t, model.CreateBusinessWorkspace(ws))
	var product model.BusinessProduct
	require.NoError(t, model.DB.Where("code = ?", model.BusinessProductCodeStandard).First(&product).Error)
	pv := &model.BusinessPriceVersion{
		ProductId: product.Id, PriceAmount: amount, Currency: "CNY",
		BillingCadence: model.BusinessBillingCadenceMonthly, DisplayUnit: "/ month",
		EffectiveFrom: 1, Enabled: true,
	}
	require.NoError(t, model.CreateBusinessPriceVersion(pv))
	order := &model.BusinessSeatOrder{
		OrderNo: tradeNo, UserId: 99, ProductId: product.Id, WorkspaceId: ws.Id, PriceVersionId: pv.Id,
		QuoteId: 1, OrderType: model.BusinessOrderTypeNew, ChatgptEmail: "buyer@gmail.com",
		Currency: "CNY", CurrentCycleAmount: amount, TotalAmount: amount,
		PrepaidThrough: time.Now().AddDate(0, 1, 0).Unix(), Status: model.BusinessOrderStatusPaying,
		PaymentStatus: "PENDING", ProvisioningStatus: model.BusinessProvisioningStatusPending,
	}
	require.NoError(t, model.DB.Create(order).Error)
}

func seedWalletPendingTopUp(t *testing.T, tradeNo string, userID int, money float64) {
	t.Helper()
	user := &model.User{Id: userID, Username: "wallet-user", Status: common.UserStatusEnabled}
	require.NoError(t, model.DB.Create(user).Error)
	topUp := &model.TopUp{
		UserId: userID, Amount: 1, Money: money, TradeNo: tradeNo,
		PaymentMethod: "alipay", PaymentProvider: model.PaymentProviderAlipay,
		Status: common.TopUpStatusPending, CreateTime: time.Now().Unix(),
	}
	require.NoError(t, topUp.Insert())
}

func TestBusinessSeatOrderOnWalletNotifyFailsSafely(t *testing.T) {
	privatePEM, _ := withAlipayCheckoutTestConfig(t)
	setupAlipayNotifyIsolationDB(t)
	tradeNo := model.GenerateBusinessSeatOrderNo(501)
	seedBusinessSeatPayingOrder(t, tradeNo, decimal.RequireFromString("100.00"))

	body := postAlipayNotify(t, AlipayNotify, signedAlipayNotifyForm(t, privatePEM, tradeNo, "100.00"))
	require.Equal(t, "fail", body)

	var order model.BusinessSeatOrder
	require.NoError(t, model.DB.Where("order_no = ?", tradeNo).First(&order).Error)
	assert.Equal(t, model.BusinessOrderStatusPaying, order.Status)

	var subCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Count(&subCount).Error)
	assert.Zero(t, subCount)
}

func TestWalletOrderOnBusinessSeatNotifyFailsSafely(t *testing.T) {
	privatePEM, _ := withAlipayCheckoutTestConfig(t)
	setupAlipayNotifyIsolationDB(t)
	tradeNo := "USR99NOwalletcross"
	seedWalletPendingTopUp(t, tradeNo, 88, 9.99)

	body := postAlipayNotify(t, BusinessSeatAlipayNotify, signedAlipayNotifyForm(t, privatePEM, tradeNo, "9.99"))
	require.Equal(t, "fail", body)

	topUp := model.GetTopUpByTradeNo(tradeNo)
	require.NotNil(t, topUp)
	assert.Equal(t, common.TopUpStatusPending, topUp.Status)

	var subCount int64
	require.NoError(t, model.DB.Model(&model.BusinessSeatSubscription{}).Count(&subCount).Error)
	assert.Zero(t, subCount)
}

func TestBusinessSeatAlipayNotifyRejectsAmountTampering(t *testing.T) {
	privatePEM, _ := withAlipayCheckoutTestConfig(t)
	setupAlipayNotifyIsolationDB(t)
	tradeNo := model.GenerateBusinessSeatOrderNo(777)
	seedBusinessSeatPayingOrder(t, tradeNo, decimal.RequireFromString("100.00"))

	body := postAlipayNotify(t, BusinessSeatAlipayNotify, signedAlipayNotifyForm(t, privatePEM, tradeNo, "0.01"))
	require.Equal(t, "fail", body)

	var order model.BusinessSeatOrder
	require.NoError(t, model.DB.Where("order_no = ?", tradeNo).First(&order).Error)
	assert.Equal(t, model.BusinessOrderStatusPaying, order.Status)
}

func TestBusinessSeatAlipayNotifyDuplicateCallbackIsIdempotent(t *testing.T) {
	privatePEM, _ := withAlipayCheckoutTestConfig(t)
	setupAlipayNotifyIsolationDB(t)
	tradeNo := model.GenerateBusinessSeatOrderNo(888)
	seedBusinessSeatPayingOrder(t, tradeNo, decimal.RequireFromString("100.00"))
	form := signedAlipayNotifyForm(t, privatePEM, tradeNo, "100.00")

	for i := 0; i < 10; i++ {
		body := postAlipayNotify(t, BusinessSeatAlipayNotify, form)
		require.Equal(t, "success", body)
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

func TestWalletAlipayNotifyRejectsUnknownBusinessSeatTradeNo(t *testing.T) {
	privatePEM, _ := withAlipayCheckoutTestConfig(t)
	setupAlipayNotifyIsolationDB(t)
	tradeNo := model.GenerateBusinessSeatOrderNo(303)
	seedBusinessSeatPayingOrder(t, tradeNo, decimal.RequireFromString("50.00"))

	body := postAlipayNotify(t, AlipayNotify, signedAlipayNotifyForm(t, privatePEM, tradeNo, "50.00"))
	require.Equal(t, "fail", body)
}
