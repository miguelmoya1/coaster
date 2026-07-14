package registration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"printer-service/internal/config"
)

func TestGetLocalIP(t *testing.T) {
	ip, err := GetLocalIP()
	if err != nil {
		t.Skipf("GetLocalIP returned error (expected in some CI environments): %v", err)
	}
	if ip == "" {
		t.Error("expected non-empty IP address")
	}
	if ip == "127.0.0.1" || ip == "::1" {
		t.Errorf("expected non-loopback IP, got %s", ip)
	}
}

func TestStartIPRegistration_HTTPCall(t *testing.T) {
	called := false
	var receivedKey string
	var receivedBody map[string]string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/printer/register-ip" && r.Method == http.MethodPost {
			called = true
			receivedKey = r.Header.Get("X-Device-Key")
			json.NewDecoder(r.Body).Decode(&receivedBody)
			w.WriteHeader(http.StatusCreated)
		}
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := &config.Config{
		APIURL:    server.URL,
		BarID:     "bar-123",
		DeviceKey: "key-xyz",
		IPAddress: "192.168.1.100",
	}

	go StartIPRegistration(ctx, cfg)

	time.Sleep(50 * time.Millisecond)
	cancel()

	if !called {
		t.Error("expected register-ip request to be fired")
	}
	if receivedKey != "key-xyz" {
		t.Errorf("expected header key-xyz, got %s", receivedKey)
	}
	if receivedBody["barId"] != "bar-123" || receivedBody["ipAddress"] != "192.168.1.100" {
		t.Errorf("unexpected body registration contents: %v", receivedBody)
	}
}

func TestStartIPRegistration_FailedServer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("server error"))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := &config.Config{
		APIURL:    server.URL,
		BarID:     "bar-fail",
		DeviceKey: "key-fail",
		IPAddress: "10.0.0.1",
	}

	go StartIPRegistration(ctx, cfg)
	time.Sleep(50 * time.Millisecond)
	cancel()
}
