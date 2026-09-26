package email

import (
	"context"
	"log/slog"

	"api-go/internal/core/domain"
)

// LogMailer is ports.Mailer until P2e brings Resend: it only writes each email to the log.
// Outside production the log carries the link, so the flows can be tried in local.
type LogMailer struct {
	frontendURL  string
	isProduction bool
}

func NewLogMailer(frontendURL string, isProduction bool) *LogMailer {
	return &LogMailer{frontendURL: frontendURL, isProduction: isProduction}
}

func (m *LogMailer) SendInvite(_ context.Context, to string, invite domain.InviteEmail, language string) error {
	m.log("invite", to, language, m.frontendURL+"/invite/"+invite.Token)
	return nil
}

func (m *LogMailer) SendEmailVerification(_ context.Context, to, _, token, language string) error {
	m.log("verifyEmail", to, language, m.frontendURL+"/verify-email/"+token)
	return nil
}

func (m *LogMailer) SendPasswordReset(_ context.Context, to, _, token, language string) error {
	m.log("resetPassword", to, language, m.frontendURL+"/reset-password/"+token)
	return nil
}

func (m *LogMailer) SendPasswordChanged(_ context.Context, to, _, language string) error {
	m.log("passwordChanged", to, language, m.frontendURL+"/forgot-password")
	return nil
}

func (m *LogMailer) log(kind, to, language, link string) {
	attrs := []any{"kind", kind, "to", to, "language", language}
	if !m.isProduction {
		attrs = append(attrs, "link", link)
	}

	slog.Info("email not sent: there is no email provider yet", attrs...)
}
