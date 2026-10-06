package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

type sentEmail struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func newTestResend(t *testing.T, from string, status int) (*ResendMailer, *[]sentEmail) {
	t.Helper()

	var sent []sentEmail
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/emails" || r.Header.Get("Authorization") != "Bearer re_test" {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		var email sentEmail
		json.NewDecoder(r.Body).Decode(&email)
		sent = append(sent, email)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if status == http.StatusOK {
			w.Write([]byte(`{"id":"sent"}`))
		} else {
			w.Write([]byte(`{"statusCode":422,"name":"validation_error","message":"Invalid from field"}`))
		}
	}))
	t.Cleanup(server.Close)

	mailer := NewResendMailer("re_test", from, "https://beta.coaster.business")
	mailer.client.BaseURL, _ = url.Parse(server.URL + "/")

	return mailer, &sent
}

var testInvite = domain.InviteEmail{EstablishmentName: "Establishment Pepe", InviterName: "Miguel", Token: "a-token"}

func TestResendSender(t *testing.T) {
	mailer, sent := newTestResend(t, "Coaster <hola@midominio.test>", http.StatusOK)

	if err := mailer.SendInvite(context.Background(), "nuevo@establishment.com", testInvite, "es"); err != nil {
		t.Fatal(err)
	}

	email := (*sent)[0]
	if email.From != "Coaster <hola@midominio.test>" || len(email.To) != 1 || email.To[0] != "nuevo@establishment.com" {
		t.Errorf("email = %+v", email)
	}
}

func TestResendRefusal(t *testing.T) {
	mailer, _ := newTestResend(t, "Coaster <hello@coaster.business>", http.StatusUnprocessableEntity)

	if err := mailer.SendInvite(context.Background(), "nuevo@establishment.com", testInvite, "es"); err == nil {
		t.Errorf("a refused email must be an error")
	}
}

func TestResendUnreachable(t *testing.T) {
	mailer := NewResendMailer("re_test", "Coaster <hello@coaster.business>", "https://beta.coaster.business")
	mailer.client.BaseURL, _ = url.Parse("http://127.0.0.1:1/")

	if err := mailer.SendPasswordChanged(context.Background(), "ana@example.com", "Ana", "es"); err == nil {
		t.Errorf("a failed call must be an error")
	}
}

func TestResendEmails(t *testing.T) {
	tests := []struct {
		name        string
		send        func(*ResendMailer) error
		wantSubject string
		contains    []string
		excludes    []string
	}{
		{
			name:        "the invitation names the inviter and the establishment",
			send:        func(m *ResendMailer) error { return m.SendInvite(context.Background(), "x@y.z", testInvite, "es") },
			wantSubject: "Invitación a Coaster",
			contains:    []string{"Miguel", "Establishment Pepe", `lang="es"`, "https://beta.coaster.business/invite/a-token", "© 2026 Coaster App. Todos los derechos reservados."},
			excludes:    []string{"{{", "<no value>"},
		},
		{
			name:        "the invitation in English",
			send:        func(m *ResendMailer) error { return m.SendInvite(context.Background(), "x@y.z", testInvite, "en") },
			wantSubject: "You have been invited to Coaster",
			contains:    []string{"has invited you to join the team at", `lang="en"`, "If the button does not work"},
		},
		{
			name:        "an unknown language falls back to Spanish",
			send:        func(m *ResendMailer) error { return m.SendInvite(context.Background(), "x@y.z", testInvite, "fr") },
			wantSubject: "Invitación a Coaster",
			contains:    []string{`lang="es"`},
		},
		{
			name: "an establishment name with markup is escaped",
			send: func(m *ResendMailer) error {
				invite := testInvite
				invite.EstablishmentName = "<script>alert(1)</script>"
				return m.SendInvite(context.Background(), "x@y.z", invite, "es")
			},
			wantSubject: "Invitación a Coaster",
			contains:    []string{"&lt;script&gt;alert(1)&lt;/script&gt;"},
			excludes:    []string{"<script>"},
		},
		{
			name: "a verification points at the token",
			send: func(m *ResendMailer) error {
				return m.SendEmailVerification(context.Background(), "x@y.z", "Ana", "tok-1", "es")
			},
			wantSubject: "Confirma tu correo en Coaster",
			contains:    []string{"https://beta.coaster.business/verify-email/tok-1", "Hola <strong style=\"color: #0e0e0e;\">Ana</strong>"},
		},
		{
			name: "a reset points at the token",
			send: func(m *ResendMailer) error {
				return m.SendPasswordReset(context.Background(), "x@y.z", "Ana", "tok-2", "en")
			},
			wantSubject: "Change your Coaster password",
			contains:    []string{"https://beta.coaster.business/reset-password/tok-2"},
		},
		{
			name:        "the changed-password notice points at asking for a new one",
			send:        func(m *ResendMailer) error { return m.SendPasswordChanged(context.Background(), "x@y.z", "Ana", "es") },
			wantSubject: "Tu contraseña de Coaster ha cambiado",
			contains:    []string{"https://beta.coaster.business/forgot-password", "No he sido yo"},
		},
		{
			name: "a name with markup is escaped",
			send: func(m *ResendMailer) error {
				return m.SendPasswordChanged(context.Background(), "x@y.z", "<b>Ana</b>", "es")
			},
			wantSubject: "Tu contraseña de Coaster ha cambiado",
			contains:    []string{"&lt;b&gt;Ana&lt;/b&gt;"},
			excludes:    []string{"<b>Ana</b>"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mailer, sent := newTestResend(t, "Coaster <hello@coaster.business>", http.StatusOK)

			if err := tt.send(mailer); err != nil {
				t.Fatal(err)
			}

			email := (*sent)[0]
			if email.Subject != tt.wantSubject {
				t.Errorf("subject = %q, want %q", email.Subject, tt.wantSubject)
			}
			for _, text := range tt.contains {
				if !strings.Contains(email.HTML, text) {
					t.Errorf("the email does not contain %q", text)
				}
			}
			for _, text := range tt.excludes {
				if strings.Contains(email.HTML, text) {
					t.Errorf("the email contains %q", text)
				}
			}
		})
	}
}
