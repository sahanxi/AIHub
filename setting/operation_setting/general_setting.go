package operation_setting

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"

	"github.com/shopspring/decimal"
)

// 额度展示类型
const (
	QuotaDisplayTypeUSD    = "USD"
	QuotaDisplayTypeCNY    = "CNY"
	QuotaDisplayTypeTokens = "TOKENS"
	QuotaDisplayTypeCustom = "CUSTOM"
)

type GeneralSetting struct {
	DocsLink            string `json:"docs_link"`
	PingIntervalEnabled bool   `json:"ping_interval_enabled"`
	PingIntervalSeconds int    `json:"ping_interval_seconds"`
	// 当前站点额度展示类型：USD / CNY / TOKENS
	QuotaDisplayType string `json:"quota_display_type"`
	// 自定义货币符号，用于 CUSTOM 展示类型
	CustomCurrencySymbol string `json:"custom_currency_symbol"`
	// 自定义货币与美元汇率（1 USD = X Custom）
	CustomCurrencyExchangeRate float64 `json:"custom_currency_exchange_rate"`
}

// 默认配置
var generalSetting = GeneralSetting{
	DocsLink:                   "/docs",
	PingIntervalEnabled:        false,
	PingIntervalSeconds:        60,
	QuotaDisplayType:           QuotaDisplayTypeCNY,
	CustomCurrencySymbol:       "¤",
	CustomCurrencyExchangeRate: 1.0,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("general_setting", &generalSetting)
}

func GetGeneralSetting() *GeneralSetting {
	return &generalSetting
}

// IsCurrencyDisplay 是否以货币形式展示（美元或人民币）
func IsCurrencyDisplay() bool {
	return generalSetting.QuotaDisplayType != QuotaDisplayTypeTokens
}

// IsCNYDisplay 是否以人民币展示
func IsCNYDisplay() bool {
	return generalSetting.QuotaDisplayType == QuotaDisplayTypeCNY
}

// GetQuotaDisplayType 返回额度展示类型
func GetQuotaDisplayType() string {
	return generalSetting.QuotaDisplayType
}

// GetCurrencySymbol 返回当前展示类型对应符号
func GetCurrencySymbol() string {
	switch generalSetting.QuotaDisplayType {
	case QuotaDisplayTypeUSD:
		return "$"
	case QuotaDisplayTypeCNY:
		return "¥"
	case QuotaDisplayTypeCustom:
		if generalSetting.CustomCurrencySymbol != "" {
			return generalSetting.CustomCurrencySymbol
		}
		return "¤"
	default:
		return ""
	}
}

// GetUsdToCurrencyRate 返回 1 USD = X <currency> 的 X（TOKENS 不适用）
func GetUsdToCurrencyRate(usdToCny float64) float64 {
	switch generalSetting.QuotaDisplayType {
	case QuotaDisplayTypeUSD:
		return 1
	case QuotaDisplayTypeCNY:
		return usdToCny
	case QuotaDisplayTypeCustom:
		if generalSetting.CustomCurrencyExchangeRate > 0 {
			return generalSetting.CustomCurrencyExchangeRate
		}
		return 1
	default:
		return 1
	}
}

func topUpAmountExchangeRate() float64 {
	switch GetQuotaDisplayType() {
	case QuotaDisplayTypeCNY:
		if USDExchangeRate > 0 {
			return USDExchangeRate
		}
	case QuotaDisplayTypeCustom:
		if generalSetting.CustomCurrencyExchangeRate > 0 {
			return generalSetting.CustomCurrencyExchangeRate
		}
	}
	return 1
}

// WalletQuotaFromTopUpAmount converts a user-facing top-up amount into wallet
// quota. USD amounts stay 1:1 with QuotaPerUnit. CNY/CUSTOM amounts are local
// currency, so they are divided by the USD exchange rate before conversion.
func WalletQuotaFromTopUpAmount(amount int64) (int, error) {
	quota := decimal.NewFromInt(amount)
	if GetQuotaDisplayType() == QuotaDisplayTypeTokens {
		quotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		quota = decimal.NewFromInt(quota.Div(quotaPerUnit).IntPart()).Mul(quotaPerUnit)
		return common.WalletQuotaFromDecimalStrict(quota)
	}
	rate := topUpAmountExchangeRate()
	if rate != 1 {
		quota = quota.Div(decimal.NewFromFloat(rate))
	}
	return common.WalletQuotaFromDecimalStrict(quota.Mul(decimal.NewFromFloat(common.QuotaPerUnit)))
}
