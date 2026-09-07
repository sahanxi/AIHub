package common

import "testing"

func TestMaskSecretHeaderValue(t *testing.T) {
	t.Parallel()

	got := maskSecretHeaderValue("Bearer sk-abcdefghijklmnopqrstuvwxyz")
	if got != "Bearer sk-a...wxyz" {
		t.Fatalf("unexpected mask: %q", got)
	}
	if maskSecretHeaderValue("short") != "***" {
		t.Fatalf("short secrets should be fully masked")
	}
	if redactClonedHeaderValue("Content-Type", "application/json") != "application/json" {
		t.Fatal("non-secret headers must pass through")
	}
	if redactClonedHeaderValue("Authorization", "Bearer sk-abcdefghijklmnopqrstuvwxyz") == "Bearer sk-abcdefghijklmnopqrstuvwxyz" {
		t.Fatal("authorization must be redacted")
	}
}
