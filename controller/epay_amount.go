package controller

import (
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
)

// epayPaidAmountMatches compares the signed callback money with the stored order.
// Credit still uses DB Amount; this is defense-in-depth against underpayment.
func epayPaidAmountMatches(orderMoney float64, callbackMoney string) error {
	trimmed := strings.TrimSpace(callbackMoney)
	if trimmed == "" {
		return fmt.Errorf("callback money missing")
	}
	paid, err := decimal.NewFromString(trimmed)
	if err != nil {
		return fmt.Errorf("callback money invalid: %w", err)
	}
	expected := decimal.NewFromFloat(orderMoney)
	diff := paid.Sub(expected).Abs()
	if diff.GreaterThan(decimal.RequireFromString("0.01")) {
		return fmt.Errorf("callback money mismatch paid=%s expected=%.2f", trimmed, orderMoney)
	}
	return nil
}
