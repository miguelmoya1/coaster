package e2e

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

const mailWait = time.Second

type email struct {
	Kind  string `json:"kind"`
	To    string `json:"to"`
	Token string `json:"token"`
}

type mailbox struct {
	url  string
	mu   sync.Mutex
	sent []email
}

func newMailbox(t *testing.T) *mailbox {
	t.Helper()

	box := &mailbox{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var delivered email
		if err := json.NewDecoder(r.Body).Decode(&delivered); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		box.mu.Lock()
		box.sent = append(box.sent, delivered)
		box.mu.Unlock()

		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(server.Close)

	box.url = server.URL
	return box
}

func (b *mailbox) all() []email {
	b.mu.Lock()
	defer b.mu.Unlock()

	return append([]email(nil), b.sent...)
}

func (b *mailbox) waitFor(t *testing.T, kind, to string) email {
	t.Helper()

	deadline := time.Now().Add(mailWait)
	for time.Now().Before(deadline) {
		for _, sent := range b.all() {
			if sent.Kind == kind && sent.To == to {
				return sent
			}
		}
		time.Sleep(20 * time.Millisecond)
	}

	t.Fatalf("no %s email ever reached %s", kind, to)
	return email{}
}

func (b *mailbox) count(kind string) int {
	count := 0
	for _, sent := range b.all() {
		if sent.Kind == kind {
			count++
		}
	}
	return count
}

func (b *mailbox) expectNone(t *testing.T, kind string) {
	t.Helper()

	time.Sleep(200 * time.Millisecond)
	if count := b.count(kind); count != 0 {
		t.Errorf("%d %s emails were sent, want none", count, kind)
	}
}
