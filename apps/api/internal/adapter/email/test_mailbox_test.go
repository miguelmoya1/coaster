package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestTestMailbox(t *testing.T) {
	var received []map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		received = append(received, body)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	ctx := context.Background()
	mailbox := NewTestMailbox(server.URL)

	calls := []func() error{
		func() error { return mailbox.SendInvite(ctx, "a@x.com", domain.InviteEmail{Token: "t1"}, "es") },
		func() error { return mailbox.SendEmailVerification(ctx, "b@x.com", "B", "t2", "es") },
		func() error { return mailbox.SendPasswordReset(ctx, "c@x.com", "C", "t3", "en") },
		func() error { return mailbox.SendPasswordChanged(ctx, "d@x.com", "D", "en") },
	}
	for _, call := range calls {
		if err := call(); err != nil {
			t.Fatalf("send: %v", err)
		}
	}

	want := []map[string]any{
		{"kind": "invite", "to": "a@x.com", "token": "t1"},
		{"kind": "verifyEmail", "to": "b@x.com", "token": "t2"},
		{"kind": "resetPassword", "to": "c@x.com", "token": "t3"},
		{"kind": "passwordChanged", "to": "d@x.com"},
	}
	if len(received) != len(want) {
		t.Fatalf("received %v", received)
	}
	for i := range want {
		if len(received[i]) != len(want[i]) {
			t.Errorf("email %d = %v, want %v", i, received[i], want[i])
			continue
		}
		for key, value := range want[i] {
			if received[i][key] != value {
				t.Errorf("email %d = %v, want %v", i, received[i], want[i])
			}
		}
	}
}

func TestTestMailboxFailsWithoutA2xx(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	err := NewTestMailbox(server.URL).SendPasswordChanged(context.Background(), "d@x.com", "D", "es")
	if err == nil {
		t.Fatalf("a 400 from the mailbox must be an error")
	}
}
