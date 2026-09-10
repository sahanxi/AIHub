package setting

import (
	"os"
	"strings"
)

var AlipayAppId = ""
var AlipayPrivateKey = ""
var AlipayPublicKey = ""
var AlipayGateway = "https://openapi.alipay.com/gateway.do"
var AlipayNotifyURL = ""

func init() {
	AlipayAppId = strings.TrimSpace(os.Getenv("ALIPAY_APP_ID"))
	if gateway := strings.TrimSpace(os.Getenv("ALIPAY_GATEWAY")); gateway != "" {
		AlipayGateway = gateway
	}
	AlipayNotifyURL = strings.TrimSpace(os.Getenv("ALIPAY_NOTIFY_URL"))
	AlipayPrivateKey = loadAlipaySecret("ALIPAY_PRIVATE_KEY", "ALIPAY_PRIVATE_KEY_FILE")
	AlipayPublicKey = loadAlipaySecret("ALIPAY_PUBLIC_KEY", "ALIPAY_PUBLIC_KEY_FILE")
}

func AlipayDirectConfigured() bool {
	return strings.TrimSpace(AlipayAppId) != "" &&
		strings.TrimSpace(AlipayPrivateKey) != "" &&
		strings.TrimSpace(AlipayPublicKey) != "" &&
		strings.TrimSpace(AlipayGateway) != ""
}

func loadAlipaySecret(envValue, envFile string) string {
	if value := strings.TrimSpace(os.Getenv(envValue)); value != "" {
		return strings.ReplaceAll(value, `\n`, "\n")
	}
	path := strings.TrimSpace(os.Getenv(envFile))
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(strings.ReplaceAll(string(data), `\n`, "\n"))
}
