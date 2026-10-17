package email

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestLogMailer(t *testing.T) {
	ctx := context.Background()

	// Dev mode
	devMailer := NewLogMailer("http://localhost:4200", false)
	if err := devMailer.SendInvite(ctx, "ana@example.com", domain.InviteEmail{Token: "inv-token"}, "es"); err != nil {
		t.Errorf("SendInvite: %v", err)
	}
	if err := devMailer.SendEmailVerification(ctx, "ana@example.com", "Ana", "verify-token", "en"); err != nil {
		t.Errorf("SendEmailVerification: %v", err)
	}
	if err := devMailer.SendPasswordReset(ctx, "ana@example.com", "Ana", "reset-token", "es"); err != nil {
		t.Errorf("SendPasswordReset: %v", err)
	}
	if err := devMailer.SendPasswordChanged(ctx, "ana@example.com", "Ana", "es"); err != nil {
		t.Errorf("SendPasswordChanged: %v", err)
	}

	// Production mode (covers !m.isProduction false branch)
	prodMailer := NewLogMailer("https://app.coaster.com", true)
	if err := prodMailer.SendInvite(ctx, "ana@example.com", domain.InviteEmail{Token: "inv-token"}, "es"); err != nil {
		t.Errorf("prod SendInvite: %v", err)
	}
}
