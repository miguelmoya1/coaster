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
	type registration struct {
		EstablishmentID string `json:"establishmentId"`
		IPAddress       string `json:"ipAddress"`
		Port            int    `json:"port"`
	}

	received := make(chan registration, 1)
	var receivedKey string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/printer/register-ip" || r.Method != http.MethodPost {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		receivedKey = r.Header.Get("X-Device-Key")

		var body registration
		json.NewDecoder(r.Body).Decode(&body)
		select {
		case received <- body:
		default:
		}

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := &config.Config{
		APIURL:          server.URL,
		Port:            "9090",
		EstablishmentID: "establishment-123",
		DeviceKey:       "key-xyz",
		IPAddress:       "192.168.1.100",
	}

	go StartIPRegistration(ctx, cfg)

	select {
	case body := <-received:
		if body.EstablishmentID != "establishment-123" || body.IPAddress != "192.168.1.100" {
			t.Errorf("unexpected registration contents: %+v", body)
		}
		if body.Port != 9090 {
			t.Errorf("expected port 9090 to be registered, got %d", body.Port)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("expected a register-ip request to be fired")
	}

	if receivedKey != "key-xyz" {
		t.Errorf("expected header key-xyz, got %s", receivedKey)
	}
}

func TestStartIPRegistration_FailedServer(t *testing.T) {
	requests := make(chan struct{}, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case requests <- struct{}{}:
		default:
		}
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("server error"))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := &config.Config{
		APIURL:          server.URL,
		Port:            "8080",
		EstablishmentID: "establishment-fail",
		DeviceKey:       "key-fail",
		IPAddress:       "10.0.0.1",
	}

	go StartIPRegistration(ctx, cfg)

	select {
	case <-requests:
	case <-time.After(2 * time.Second):
		t.Fatal("expected a request even though the server errors")
	}
}

func TestStartIPRegistration_SkipsAnInvalidPort(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("expected no request when the port is unusable")
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go StartIPRegistration(ctx, &config.Config{
		APIURL:          server.URL,
		Port:            "not-a-port",
		EstablishmentID: "establishment-123",
		DeviceKey:       "key-xyz",
		IPAddress:       "192.168.1.100",
	})

	time.Sleep(50 * time.Millisecond)
}
