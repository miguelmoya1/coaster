package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestPrinterPairingRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	pairings := NewPrinterPairingRepository(testPool)
	insertPrinterEstablishment(t, "e1")

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	if err := pairings.Issue(ctx, "7F3KB92X", "e1", now.Add(time.Hour)); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if err := pairings.Issue(ctx, "BCDFGHJK", "e1", now.Add(-time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := pairings.Issue(ctx, "7F3KB92X", "e1", now.Add(time.Hour)); err == nil {
		t.Error("a code issued twice should fail")
	}
	if err := pairings.Issue(ctx, "CDFGHJKL", "missing", now.Add(time.Hour)); !domain.HasCode(err, domain.CodeEstablishmentNotFound) {
		t.Errorf("a code for an establishment that does not exist = %v, want ESTABLISHMENT_NOT_FOUND", err)
	}

	tests := []struct {
		name string
		code string
		want string
	}{
		{name: "valid code", code: "7F3KB92X", want: "e1"},
		{name: "the same code again", code: "7F3KB92X", want: ""},
		{name: "expired code", code: "BCDFGHJK", want: ""},
		{name: "code nobody issued", code: "ZZZZZZZZ", want: ""},
	}

	for _, tt := range tests {
		got, err := pairings.Redeem(ctx, tt.code, now)
		if err != nil || got != tt.want {
			t.Errorf("%s: Redeem = %q, %v, want %q", tt.name, got, err, tt.want)
		}
	}
}
