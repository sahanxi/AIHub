package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/service/businessseat"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

type businessSeatAlipayPayRequest struct {
	OrderId int `json:"order_id"`
}

func BusinessSeatRequestAlipay(c *gin.Context) {
	if !setting.IsBusinessSeatSalesEnabled() {
		common.ApiErrorMsg(c, "Business seat sales are currently disabled")
		return
	}
	userId := c.GetInt("id")
	var req businessSeatAlipayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.OrderId <= 0 {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	order, err := model.GetBusinessSeatOrderById(req.OrderId)
	if err != nil {
		common.ApiErrorMsg(c, "Order not found")
		return
	}
	if order.UserId != userId {
		common.ApiErrorMsg(c, "Order not owned by user")
		return
	}
	if order.Status != model.BusinessOrderStatusCreated && order.Status != model.BusinessOrderStatusPaying {
		common.ApiErrorMsg(c, "Order not payable")
		return
	}

	notifyURL := setting.ResolveAlipayBusinessSeatNotifyURL(service.GetCallbackAddress())
	returnURL := paymentReturnPath("/chatgpt-business?pay=success")
	tradeNo := order.OrderNo
	settledAmount, settledCurrency, err := businessseat.SettleForAlipay(order.TotalAmount, order.Currency)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("business seat alipay settlement failed order=%s error=%q", tradeNo, err.Error()))
		common.ApiErrorMsg(c, "Failed to start payment")
		return
	}
	totalAmount := businessseat.FormatMoney(settledAmount, settledCurrency)
	subject := strings.TrimSpace(common.SystemName)
	if subject == "" {
		subject = "AIHub"
	}
	subject += " ChatGPT Business Seat"

	wap := isAlipayMobileRequest(c.Request.UserAgent())
	checkoutURL, err := service.BuildAlipayCheckoutURL(service.AlipayPagePayArgs{
		OutTradeNo:  tradeNo,
		Subject:     subject,
		TotalAmount: totalAmount,
		NotifyURL:   notifyURL,
		ReturnURL:   returnURL,
		Wap:         wap,
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("business seat alipay checkout failed order=%s error=%q", tradeNo, err.Error()))
		common.ApiErrorMsg(c, "Failed to start payment")
		return
	}
	_ = model.DB.Model(order).Updates(map[string]interface{}{
		"status":              model.BusinessOrderStatusPaying,
		"payment_channel":     model.PaymentProviderAlipay,
		"payment_order_no":    tradeNo,
		"settlement_amount":   settledAmount,
		"settlement_currency": settledCurrency,
	}).Error

	common.ApiSuccess(c, gin.H{
		"mode":                "redirect",
		"url":                 checkoutURL,
		"settlement_amount":   totalAmount,
		"settlement_currency": settledCurrency,
		"display_amount":      businessseat.FormatMoney(order.TotalAmount, order.Currency),
		"display_currency":    order.Currency,
	})
}

func BusinessSeatAlipayNotify(c *gin.Context) {
	if !isAlipayWebhookEnabled() {
		writeAlipayNotify(c, "fail")
		return
	}
	if err := c.Request.ParseForm(); err != nil {
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
	if strings.TrimSpace(params["app_id"]) != strings.TrimSpace(setting.AlipayAppId) {
		writeAlipayNotify(c, "fail")
		return
	}
	if err := service.VerifyAlipayNotification(setting.AlipayPublicKey, params); err != nil {
		writeAlipayNotify(c, "fail")
		return
	}
	if !service.AlipayTradePaid(params["trade_status"]) {
		writeAlipayNotify(c, "success")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	order, err := model.GetBusinessSeatOrderByOrderNo(tradeNo)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("business seat alipay order not found trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		writeAlipayNotify(c, "fail")
		return
	}

	paidAmount, err := decimal.NewFromString(strings.TrimSpace(params["total_amount"]))
	if err != nil {
		writeAlipayNotify(c, "fail")
		return
	}
	expectedAmount := order.TotalAmount
	expectedCurrency := order.Currency
	if order.SettlementCurrency != "" && order.SettlementAmount.GreaterThan(decimal.Zero) {
		expectedAmount = order.SettlementAmount
		expectedCurrency = order.SettlementCurrency
	} else {
		settled, settledCurrency, settleErr := businessseat.SettleForAlipay(order.TotalAmount, order.Currency)
		if settleErr != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("business seat alipay settlement resolve failed order=%s error=%q", tradeNo, settleErr.Error()))
			writeAlipayNotify(c, "fail")
			return
		}
		expectedAmount = settled
		expectedCurrency = settledCurrency
	}
	expectedMoney, _ := expectedAmount.Float64()
	if err := epayPaidAmountMatches(expectedMoney, params["total_amount"]); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("business seat alipay amount mismatch order=%s error=%q", tradeNo, err.Error()))
		writeAlipayNotify(c, "fail")
		return
	}

	providerTradeNo := strings.TrimSpace(params["trade_no"])
	_, err = businessseat.NewProvisioningService().ProcessPayment(businessseat.PaymentConfirmInput{
		OrderNo:         tradeNo,
		ProviderTradeNo: providerTradeNo,
		PaidAmount:      paidAmount,
		Currency:        expectedCurrency,
		PaymentChannel:  model.PaymentProviderAlipay,
	})
	if err != nil && !errors.Is(err, model.ErrBusinessOrderNotFound) {
		if order.Status == model.BusinessOrderStatusPaid {
			writeAlipayNotify(c, "success")
			return
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("business seat alipay fulfillment failed order=%s error=%q", tradeNo, err.Error()))
		writeAlipayNotify(c, "fail")
		return
	}
	writeAlipayNotify(c, "success")
}

func BusinessSeatAlipayReturn(c *gin.Context) {
	c.Redirect(http.StatusFound, paymentReturnPath("/chatgpt-business?pay=success")+"&t="+fmt.Sprintf("%d", time.Now().Unix()))
}
