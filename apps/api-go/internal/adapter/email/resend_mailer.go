package email

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/resend/resend-go/v3"

	"api-go/internal/core/domain"
)

type ResendMailer struct {
	client      *resend.Client
	from        string
	frontendURL string
}

func NewResendMailer(apiKey, from, frontendURL string) *ResendMailer {
	return &ResendMailer{client: resend.NewClient(apiKey), from: from, frontendURL: frontendURL}
}

func (m *ResendMailer) SendInvite(ctx context.Context, to string, invite domain.InviteEmail, language string) error {
	return m.send(ctx, to, kindInvite, language, m.frontendURL+"/invite/"+invite.Token, map[string]string{
		"establishmentName": invite.EstablishmentName,
		"inviterName":       invite.InviterName,
	})
}

func (m *ResendMailer) SendEmailVerification(ctx context.Context, to, name, token, language string) error {
	return m.send(ctx, to, kindVerifyEmail, language, m.frontendURL+"/verify-email/"+token, map[string]string{"name": name})
}

func (m *ResendMailer) SendPasswordReset(ctx context.Context, to, name, token, language string) error {
	return m.send(ctx, to, kindResetPassword, language, m.frontendURL+"/reset-password/"+token, map[string]string{"name": name})
}

func (m *ResendMailer) SendPasswordChanged(ctx context.Context, to, name, language string) error {
	return m.send(ctx, to, kindPasswordChanged, language, m.frontendURL+"/forgot-password", map[string]string{"name": name})
}

func (m *ResendMailer) send(ctx context.Context, to string, kind emailKind, language, actionURL string, values map[string]string) error {
	email, err := renderEmail(kind, language, actionURL, values)
	if err != nil {
		return fmt.Errorf("rendering the %s email: %w", kind, err)
	}

	_, err = m.client.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
		From:    m.from,
		To:      []string{to},
		Subject: email.Subject,
		Html:    email.HTML,
	})
	if err != nil {
		slog.Error("Resend refused the email", "kind", kind, "to", to, "error", err)
		return fmt.Errorf("could not send the %s email", kind)
	}

	slog.Debug("sent the email", "kind", kind, "to", to)
	return nil
}
