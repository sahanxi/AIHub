package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

func requestAlipayDirect(c *gin.Context, userId int, req EpayRequest, payMoney float64) {
	notifyURL := strings.TrimSpace(setting.AlipayNotifyURL)
	if notifyURL == "" {
		notifyURL = strings.TrimRight(service.GetCallbackAddress(), "/") + "/api/payment/alipay/notify"
	}
	returnURL := paymentReturnPath("/wallet?pay=success")
	tradeNo := fmt.Sprintf("USR%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
	totalAmount := strconv.FormatFloat(payMoney, 'f', 2, 64)
	subject := strings.TrimSpace(common.SystemName)
	if subject == "" {
		subject = "AIHub"
	}
	subject += " 钱包充值"

	checkoutURL, err := service.BuildAlipayCheckoutURL(service.AlipayPagePayArgs{
		OutTradeNo:  tradeNo,
		Subject:     subject,
		TotalAmount: totalAmount,
		NotifyURL:   notifyURL,
		ReturnURL:   returnURL,
		Wap:         isAlipayMobileRequest(c.Request.UserAgent()),
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 拉起支付失败 user_id=%d trade_no=%s amount=%d error=%q", userId, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:          userId,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: model.PaymentProviderAlipay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", userId, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f", userId, tradeNo, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    gin.H{"mode": "redirect"},
		"url":     checkoutURL,
	})
}

func AlipayNotify(c *gin.Context) {
	if !isAlipayWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		writeAlipayNotify(c, "fail")
		return
	}
	if err := c.Request.ParseForm(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 webhook 表单解析失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		writeAlipayNotify(c, "fail")
		return
	}
	params := lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
		r[t] = c.Request.PostForm.Get(t)
		return r
	}, map[string]string{})
	if len(params) == 0 {
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}
	tradeNo := strings.TrimSpace(params["out_trade_no"])
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 webhook 收到请求 path=%q client_ip=%s trade_no=%s trade_status=%s", c.Request.RequestURI, c.ClientIP(), tradeNo, params["trade_status"]))

	if len(params) == 0 {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 参数为空 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		writeAlipayNotify(c, "fail")
		return
	}
	if strings.TrimSpace(params["app_id"]) != strings.TrimSpace(setting.AlipayAppId) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook app_id 不匹配 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		writeAlipayNotify(c, "fail")
		return
	}
	if err := service.VerifyAlipayNotification(setting.AlipayPublicKey, params); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 验签失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		writeAlipayNotify(c, "fail")
		return
	}
	if !service.AlipayTradePaid(params["trade_status"]) {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 webhook 忽略事件 trade_no=%s trade_status=%s client_ip=%s", tradeNo, params["trade_status"], c.ClientIP()))
		writeAlipayNotify(c, "success")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 回调订单不存在 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		writeAlipayNotify(c, "fail")
		return
	}
	if err := epayPaidAmountMatches(topUp.Money, params["total_amount"]); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 回调金额校验失败 trade_no=%s order_money=%.2f callback_amount=%q client_ip=%s error=%q", tradeNo, topUp.Money, params["total_amount"], c.ClientIP(), err.Error()))
		writeAlipayNotify(c, "fail")
		return
	}
	alreadyDone, err := model.RechargeAlipay(tradeNo, "alipay", c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, model.ErrTopUpNotFound):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 回调订单不存在 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentMethodMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单支付网关不匹配 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrTopUpStatusInvalid):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单状态非法 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		default:
			logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 充值处理失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		}
		writeAlipayNotify(c, "fail")
		return
	}
	if alreadyDone {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 重复回调幂等忽略 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	} else {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 充值成功 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	}
	writeAlipayNotify(c, "success")
}

func writeAlipayNotify(c *gin.Context, body string) {
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(body))
}

func isAlipayMobileRequest(userAgent string) bool {
	ua := strings.ToLower(userAgent)
	for _, token := range []string{"android", "iphone", "ipad", "ipod", "mobile", "micromessenger"} {
		if strings.Contains(ua, token) {
			return true
		}
	}
	return false
}
