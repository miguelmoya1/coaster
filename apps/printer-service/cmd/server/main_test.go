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

func mustBuild(t *testing.T, args ...string) *service {
	t.Helper()

	svc, err := buildService(args)
	if err != nil {
		t.Fatalf("buildService(%v) returned %v", args, err)
	}
	return svc
}

func TestBuildService_Defaults(t *testing.T) {
	svc := mustBuild(t)

	if svc.server.Addr != ":8080" {
		t.Errorf("expected :8080, got %s", svc.server.Addr)
	}
	if svc.cfg.PrintWidth != escpos.Width58mm {
		t.Errorf("expected the 58mm width by default, got %d", svc.cfg.PrintWidth)
	}
	if svc.cfg.CodePage.Name != escpos.CP858.Name {
		t.Errorf("expected cp858 by default, got %s", svc.cfg.CodePage.Name)
	}
}

func TestBuildService_FlagsAndValidation(t *testing.T) {
	if svc := mustBuild(t, "--local", "--port=9090"); svc.server.Addr != ":9090" {
		t.Errorf("expected :9090, got %s", svc.server.Addr)
	}

	mustBuild(t, "--printer-type=network", "--printer-path=localhost:9100")
	mustBuild(t, "--printer-path=/dev/usb/lp0")
	mustBuild(t, "--print-width=48", "--code-page=cp437")

	for _, args := range [][]string{
		{"--invalid-flag"},
		{"--printer-type=carrier-pigeon"},
		{"--print-width=4"},
		{"--code-page=utf8"},
	} {
		if _, err := buildService(args); err == nil {
			t.Errorf("expected buildService(%v) to fail", args)
		}
	}
}

func TestRoutes_CORSPreflight(t *testing.T) {
	svc := mustBuild(t, "--allowed-origins=https://coaster.business")

	req := httptest.NewRequest(http.MethodOptions, "/print", nil)
	req.Header.Set("Origin", "https://coaster.business")
	w := httptest.NewRecorder()
	svc.routes().ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for OPTIONS, got %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://coaster.business" {
		t.Errorf("expected the CORS origin header, got %q", got)
	}
}

func TestRoutes_PrintIsClosedWithoutASecret(t *testing.T) {
	svc := mustBuild(t)

	req := httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("ticket"))
	w := httptest.NewRecorder()
	svc.routes().ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 when unauthenticated printing is not enabled, got %d", w.Code)
	}
}

func TestRoutes_InsecureOptsIn(t *testing.T) {
	svc := mustBuild(t, "--insecure", "--printer-type=network", "--printer-path=127.0.0.1:9")

	req := httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("ticket"))
	w := httptest.NewRecorder()
	svc.routes().ServeHTTP(w, req)

	if w.Code == http.StatusUnauthorized {
		t.Error("expected -insecure to allow the request through")
	}
	if strings.Contains(w.Body.String(), "jwt-secret") {
		t.Errorf("expected the endpoint to be enabled, got %s", w.Body.String())
	}
}

func TestRoutes_JWTVerification(t *testing.T) {
	svc := mustBuild(t, "--jwt-secret=test-secret", "--bar-id=bar-123",
		"--printer-type=network", "--printer-path=127.0.0.1:9")
	routes := svc.routes()

	req := httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("payload"))
	w := httptest.NewRecorder()
	routes.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without a token, got %d", w.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("payload"))
	req.Header.Set("Authorization", "Bearer "+token(t, "bar-123", "test-secret"))
	w = httptest.NewRecorder()
	routes.ServeHTTP(w, req)
	if w.Code == http.StatusUnauthorized {
		t.Errorf("expected a valid token to pass, got 401: %s", w.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("payload"))
	req.Header.Set("Authorization", "Bearer "+token(t, "another-bar", "test-secret"))
	w = httptest.NewRecorder()
	routes.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for another bar's token, got %d", w.Code)
	}
}

func TestRoutes_Health(t *testing.T) {
	svc := mustBuild(t, "--bar-id=bar-123")

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	svc.routes().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]any
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("health did not return JSON: %v", err)
	}
	if body["barId"] != "bar-123" {
		t.Errorf("expected the bar id in the health payload, got %v", body["barId"])
	}
	if body["version"] == "" {
		t.Error("expected a version in the health payload")
	}
}

func TestRoutes_JSONPayloadReachesThePrinter(t *testing.T) {
	svc := mustBuild(t, "--insecure", "--printer-type=network", "--printer-path=127.0.0.1:9")

	body, _ := json.Marshal(escpos.TicketPayload{
		Type:    "order",
		BarName: "Test Bar",
		Table:   "5",
		Items:   []escpos.TicketItem{{Name: "Beer", Quantity: 1, Price: "3.50", Total: "3.50"}},
		Total:   "3.50",
	})

	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	svc.routes().ServeHTTP(w, req)

	if w.Code == http.StatusBadRequest || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("unexpected status %d: %s", w.Code, w.Body.String())
	}
}

func token(t *testing.T, barID, secret string) string {
	t.Helper()

	now := time.Now().Unix()
	h := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	p := base64.RawURLEncoding.EncodeToString([]byte(
		fmt.Sprintf(`{"barId":%q,"iat":%d,"exp":%d}`, barID, now, now+300)))

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(h + "." + p))

	return h + "." + p + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
