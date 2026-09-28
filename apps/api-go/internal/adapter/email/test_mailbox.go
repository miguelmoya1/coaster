package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"api-go/internal/core/domain"
)

type TestMailbox struct {
	url    string
	client *http.Client
}

func NewTestMailbox(url string) *TestMailbox {
	return &TestMailbox{url: url, client: &http.Client{Timeout: 5 * time.Second}}
}

type delivery struct {
	Kind  string `json:"kind"`
	To    string `json:"to"`
	Token string `json:"token,omitempty"`
}

func (m *TestMailbox) SendInvite(ctx context.Context, to string, invite domain.InviteEmail, _ string) error {
	return m.post(ctx, delivery{Kind: "invite", To: to, Token: invite.Token})
}

func (m *TestMailbox) SendEmailVerification(ctx context.Context, to, _, token, _ string) error {
	return m.post(ctx, delivery{Kind: "verifyEmail", To: to, Token: token})
}

func (m *TestMailbox) SendPasswordReset(ctx context.Context, to, _, token, _ string) error {
	return m.post(ctx, delivery{Kind: "resetPassword", To: to, Token: token})
}

func (m *TestMailbox) SendPasswordChanged(ctx context.Context, to, _, _ string) error {
	return m.post(ctx, delivery{Kind: "passwordChanged", To: to})
}

func (m *TestMailbox) post(ctx context.Context, email delivery) error {
	body, err := json.Marshal(email)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, m.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := m.client.Do(request)
	if err != nil {
		return fmt.Errorf("posting to the test mailbox: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("the test mailbox answered %d", response.StatusCode)
	}

	return nil
}
