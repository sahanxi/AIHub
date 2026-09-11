package service

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
)

const (
	AlipayMethodPagePay    = "alipay.trade.page.pay"
	AlipayMethodWapPay     = "alipay.trade.wap.pay"
	AlipayMethodTradeClose = "alipay.trade.close"
	AlipayProductPagePay   = "FAST_INSTANT_TRADE_PAY"
	AlipayProductWapPay    = "QUICK_WAP_WAY"
	AlipayTradeSuccess     = "TRADE_SUCCESS"
	AlipayTradeFinished    = "TRADE_FINISHED"
	alipayTimestampLayout  = "2006-01-02 15:04:05"
	alipayRequestTimeout   = 15 * time.Second
	alipayMaxResponseBytes = 1 << 20
)

type AlipayPagePayArgs struct {
	OutTradeNo  string
	Subject     string
	TotalAmount string
	NotifyURL   string
	ReturnURL   string
	Wap         bool
}

func BuildAlipayCheckoutURL(args AlipayPagePayArgs) (string, error) {
	if !setting.AlipayDirectConfigured() {
		return "", fmt.Errorf("alipay is not configured")
	}
	method := AlipayMethodPagePay
	productCode := AlipayProductPagePay
	if args.Wap {
		method = AlipayMethodWapPay
		productCode = AlipayProductWapPay
	}
	biz, err := common.Marshal(map[string]string{
		"out_trade_no": args.OutTradeNo,
		"product_code": productCode,
		"total_amount": args.TotalAmount,
		"subject":      args.Subject,
	})
	if err != nil {
		return "", err
	}
	params := map[string]string{
		"app_id":      setting.AlipayAppId,
		"method":      method,
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   alipayTimestampNow(),
		"version":     "1.0",
		"notify_url":  args.NotifyURL,
		"return_url":  args.ReturnURL,
		"biz_content": string(biz),
	}
	sign, err := SignAlipayRequest(setting.AlipayPrivateKey, params)
	if err != nil {
		return "", err
	}
	params["sign"] = sign
	return encodeAlipayGatewayURL(setting.AlipayGateway, params)
}

func CloseAlipayTrade(ctx context.Context, outTradeNo string) error {
	if !setting.AlipayDirectConfigured() {
		return fmt.Errorf("alipay is not configured")
	}
	tradeNo := strings.TrimSpace(outTradeNo)
	if tradeNo == "" {
		return fmt.Errorf("alipay trade number empty")
	}
	biz, err := common.Marshal(map[string]string{"out_trade_no": tradeNo})
	if err != nil {
		return err
	}
	params := map[string]string{
		"app_id":      setting.AlipayAppId,
		"method":      AlipayMethodTradeClose,
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   alipayTimestampNow(),
		"version":     "1.0",
		"biz_content": string(biz),
	}
	sign, err := SignAlipayRequest(setting.AlipayPrivateKey, params)
	if err != nil {
		return err
	}
	params["sign"] = sign
	requestURL, err := encodeAlipayGatewayURL(setting.AlipayGateway, params)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}
	client := &http.Client{Transport: alipayHTTPTransport(), Timeout: alipayRequestTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("alipay trade close request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("alipay trade close returned status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, alipayMaxResponseBytes))
	if err != nil {
		return fmt.Errorf("alipay trade close response read failed: %w", err)
	}
	if err := VerifyAlipayResponse(setting.AlipayPublicKey, body, "alipay_trade_close_response"); err != nil {
		return err
	}
	var envelope struct {
		Response struct {
			Code    string `json:"code"`
			Message string `json:"msg"`
			SubCode string `json:"sub_code"`
			SubMsg  string `json:"sub_msg"`
		} `json:"alipay_trade_close_response"`
	}
	if err := common.Unmarshal(body, &envelope); err != nil {
		return fmt.Errorf("alipay trade close response invalid: %w", err)
	}
	if envelope.Response.Code == "10000" || envelope.Response.SubCode == "ACQ.TRADE_NOT_EXIST" {
		return nil
	}
	return fmt.Errorf("alipay trade close failed: code=%s sub_code=%s message=%s", envelope.Response.Code, envelope.Response.SubCode, strings.TrimSpace(envelope.Response.SubMsg))
}

func alipayHTTPTransport() http.RoundTripper {
	client := GetHttpClient()
	if client != nil && client.Transport != nil {
		return client.Transport
	}
	return http.DefaultTransport
}

func SignAlipayRequest(privateKeyPEM string, params map[string]string) (string, error) {
	content := alipaySignContent(params, false)
	key, err := parseRSAPrivateKey(privateKeyPEM)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(content))
	sig, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(sig), nil
}

func VerifyAlipayNotification(publicKeyPEM string, params map[string]string) error {
	sign := strings.TrimSpace(params["sign"])
	if sign == "" {
		return fmt.Errorf("alipay sign missing")
	}
	if strings.TrimSpace(params["sign_type"]) != "" && strings.ToUpper(strings.TrimSpace(params["sign_type"])) != "RSA2" {
		return fmt.Errorf("alipay sign_type unsupported")
	}
	raw, err := base64.StdEncoding.DecodeString(sign)
	if err != nil {
		return fmt.Errorf("alipay sign invalid: %w", err)
	}
	key, err := parseRSAPublicKey(publicKeyPEM)
	if err != nil {
		return err
	}
	content := alipaySignContent(params, true)
	sum := sha256.Sum256([]byte(content))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, sum[:], raw); err != nil {
		return fmt.Errorf("alipay signature mismatch")
	}
	return nil
}

func VerifyAlipayResponse(publicKeyPEM string, body []byte, responseKey string) error {
	var envelope map[string]json.RawMessage
	if err := common.Unmarshal(body, &envelope); err != nil {
		return fmt.Errorf("alipay response invalid: %w", err)
	}
	response, ok := envelope[responseKey]
	if !ok || len(response) == 0 {
		return fmt.Errorf("alipay response node missing")
	}
	var sign string
	if err := common.Unmarshal(envelope["sign"], &sign); err != nil || strings.TrimSpace(sign) == "" {
		return fmt.Errorf("alipay response sign missing")
	}
	raw, err := base64.StdEncoding.DecodeString(sign)
	if err != nil {
		return fmt.Errorf("alipay response sign invalid: %w", err)
	}
	key, err := parseRSAPublicKey(publicKeyPEM)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(response)
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, sum[:], raw); err != nil {
		return fmt.Errorf("alipay response signature mismatch")
	}
	return nil
}

func AlipayTradePaid(status string) bool {
	switch strings.TrimSpace(status) {
	case AlipayTradeSuccess, AlipayTradeFinished:
		return true
	default:
		return false
	}
}

func alipayTimestampNow() string {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		loc = time.FixedZone("CST", 8*60*60)
	}
	return time.Now().In(loc).Format(alipayTimestampLayout)
}

func alipaySignContent(params map[string]string, notify bool) string {
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if value == "" {
			continue
		}
		if key == "sign" {
			continue
		}
		if notify && key == "sign_type" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+params[key])
	}
	return strings.Join(parts, "&")
}

func encodeAlipayGatewayURL(gateway string, params map[string]string) (string, error) {
	parsed, err := url.Parse(gateway)
	if err != nil {
		return "", err
	}
	query := url.Values{}
	for key, value := range params {
		if value == "" {
			continue
		}
		query.Set(key, value)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func parseRSAPrivateKey(raw string) (*rsa.PrivateKey, error) {
	der, err := decodeKeyDER(raw, "PRIVATE KEY")
	if err != nil {
		return nil, err
	}
	if key, err := x509.ParsePKCS8PrivateKey(der); err == nil {
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("alipay private key is not RSA")
		}
		return rsaKey, nil
	}
	key, err := x509.ParsePKCS1PrivateKey(der)
	if err != nil {
		return nil, fmt.Errorf("alipay private key invalid")
	}
	return key, nil
}

func parseRSAPublicKey(raw string) (*rsa.PublicKey, error) {
	der, err := decodeKeyDER(raw, "PUBLIC KEY")
	if err != nil {
		return nil, err
	}
	key, err := x509.ParsePKIXPublicKey(der)
	if err != nil {
		return nil, fmt.Errorf("alipay public key invalid")
	}
	rsaKey, ok := key.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("alipay public key is not RSA")
	}
	return rsaKey, nil
}

func decodeKeyDER(raw, pemType string) ([]byte, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, fmt.Errorf("alipay key empty")
	}
	if block, _ := pem.Decode([]byte(trimmed)); block != nil {
		return block.Bytes, nil
	}
	compact := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r == ' ' {
			return -1
		}
		return r
	}, trimmed)
	der, err := base64.StdEncoding.DecodeString(compact)
	if err != nil {
		wrapped := "-----BEGIN " + pemType + "-----\n" + wrapPEMBody(compact) + "\n-----END " + pemType + "-----\n"
		if block, _ := pem.Decode([]byte(wrapped)); block != nil {
			return block.Bytes, nil
		}
		return nil, fmt.Errorf("alipay key decode failed")
	}
	return der, nil
}

func wrapPEMBody(body string) string {
	var b strings.Builder
	for i := 0; i < len(body); i += 64 {
		end := i + 64
		if end > len(body) {
			end = len(body)
		}
		if i > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(body[i:end])
	}
	return b.String()
}
