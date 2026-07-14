package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"printer-service/internal/escpos"
)

func TestBuildMux_Options(t *testing.T) {
	srv, err := BuildServer([]string{
		"--allowed-origins=https://coaster.business",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest(http.MethodOptions, "/print", nil)
	req.Header.Set("Origin", "https://coaster.business")
	w := httptest.NewRecorder()

	srv.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for OPTIONS, got %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "https://coaster.business" {
		t.Errorf("expected CORS origin header, got %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestBuildMux_InvalidMethod(t *testing.T) {
	srv, err := BuildServer([]string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/print", nil)
	w := httptest.NewRecorder()

	srv.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 Method Not Allowed, got %d", w.Code)
	}
}

func TestBuildMux_Success(t *testing.T) {
	srv, err := BuildServer([]string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	body := []byte("test ticket content")
	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	w := httptest.NewRecorder()

	srv.Handler.ServeHTTP(w, req)

	if w.Code == http.StatusMethodNotAllowed {
		t.Error("unexpected 405")
	}
}

func TestBuildServer(t *testing.T) {
	srv, err := BuildServer([]string{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if srv.Addr != ":8080" {
		t.Errorf("expected :8080 addr, got %s", srv.Addr)
	}

	_, err = BuildServer([]string{"--invalid-flag"})
	if err == nil {
		t.Error("expected flag parse error")
	}

	srv, err = BuildServer([]string{"--local", "--port=9090"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if srv.Addr != ":9090" {
		t.Errorf("expected :9090 addr, got %s", srv.Addr)
	}

	_, err = BuildServer([]string{"--printer-type=network", "--printer-path=localhost:9100"})
	if err != nil {
		t.Errorf("expected nil error, got %v", err)
	}
}

func TestBuildMux_JWTVerification(t *testing.T) {
	srv, err := BuildServer([]string{
		"--jwt-secret=test-secret",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("print payload"))
	w := httptest.NewRecorder()
	srv.Handler.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized, got %d", w.Code)
	}

	secret := "test-secret"
	now := time.Now().Unix()
	h := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	p := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"barId":"bar-123","iat":%d,"exp":%d}`, now, now+300)))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(h + "." + p))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	validToken := h + "." + p + "." + sig

	req = httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("print payload"))
	req.Header.Set("Authorization", "Bearer "+validToken)
	w = httptest.NewRecorder()
	srv.Handler.ServeHTTP(w, req)
	if w.Code == http.StatusUnauthorized {
		t.Errorf("expected JWT to pass, got 401. Body: %s", w.Body.String())
	}
}

func TestBuildMux_JSONPayload(t *testing.T) {
	srv, err := BuildServer([]string{"--printer-type=network", "--printer-path=localhost:9100"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	payload := escpos.TicketPayload{
		Type:    "order",
		BarName: "Test Bar",
		Table:   "5",
		Items: []escpos.TicketItem{
			{Name: "Beer", Quantity: 1, Price: "3.50", Total: "3.50"},
		},
		Total: "3.50",
	}
	bodyBytes, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(bodyBytes))
	w := httptest.NewRecorder()
	srv.Handler.ServeHTTP(w, req)

	if w.Code == http.StatusBadRequest || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("unexpected status %d", w.Code)
	}
}
