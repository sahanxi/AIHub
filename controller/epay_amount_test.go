package controller

import "testing"

func TestEpayPaidAmountMatches(t *testing.T) {
	t.Parallel()

	if err := epayPaidAmountMatches(10, "10.00"); err != nil {
		t.Fatalf("expected exact match, got %v", err)
	}
	if err := epayPaidAmountMatches(10.01, "10.01"); err != nil {
		t.Fatalf("expected exact match, got %v", err)
	}
	if err := epayPaidAmountMatches(10, "10.009"); err != nil {
		t.Fatalf("expected sub-cent tolerance, got %v", err)
	}
	if err := epayPaidAmountMatches(100, ""); err == nil {
		t.Fatal("expected missing money to fail")
	}
	if err := epayPaidAmountMatches(100, "abc"); err == nil {
		t.Fatal("expected invalid money to fail")
	}
	if err := epayPaidAmountMatches(100, "99.98"); err == nil {
		t.Fatal("expected underpay to fail")
	}
	if err := epayPaidAmountMatches(100, "100.02"); err == nil {
		t.Fatal("expected overpay mismatch to fail")
	}
}
