package businessseat

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"
)

const defaultCurrencyScale = 2

var currencyScales = map[string]int32{
	"CNY": 2,
	"USD": 2,
	"EUR": 2,
	"JPY": 0,
}

func CurrencyScale(currency string) int32 {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if scale, ok := currencyScales[currency]; ok {
		return scale
	}
	return defaultCurrencyScale
}

func RoundMoney(amount decimal.Decimal, currency string) decimal.Decimal {
	return amount.Round(CurrencyScale(currency))
}

func MultiplyAndRound(price decimal.Decimal, ratio decimal.Decimal, currency string) decimal.Decimal {
	return RoundMoney(price.Mul(ratio), currency)
}

func FormatMoney(amount decimal.Decimal, currency string) string {
	return RoundMoney(amount, currency).StringFixed(CurrencyScale(currency))
}

// SettleForAlipay converts a catalog amount into the CNY total Alipay expects.
// CNY catalog prices pass through; USD prices use the site-wide USD→CNY rate.
func SettleForAlipay(amount decimal.Decimal, currency string) (decimal.Decimal, string, error) {
	cny, err := operation_setting.ConvertAmountToCNY(amount, currency)
	if err != nil {
		return decimal.Zero, "", err
	}
	return RoundMoney(cny, "CNY"), "CNY", nil
}

func AlipayAmountString(amount decimal.Decimal, currency string) string {
	settled, _, err := SettleForAlipay(amount, currency)
	if err != nil {
		return FormatMoney(amount, currency)
	}
	return FormatMoney(settled, "CNY")
}
