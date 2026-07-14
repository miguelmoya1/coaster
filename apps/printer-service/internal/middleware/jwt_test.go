package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func genToken(barID string, exp int64, secret []byte) string {
	now := time.Now().Unix()
	h := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	p := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"barId":"%s","iat":%d,"exp":%d}`, barID, now, exp)))
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(h + "." + p))
	s := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return h + "." + p + "." + s
}

func TestValidateJWT_Success(t *testing.T) {
	secret := []byte("my-secret")
	now := time.Now().Unix()
	token := genToken("bar-1", now+300, secret)

	payload, err := ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if payload.BarID != "bar-1" {
		t.Errorf("expected barId bar-1, got %s", payload.BarID)
	}
}

func TestValidateJWT_Expired(t *testing.T) {
	secret := []byte("my-secret")
	now := time.Now().Unix()
	token := genToken("bar-1", now-10, secret)

	_, err := ValidateJWT(token, secret)
	if err == nil {
		t.Error("expected error for expired token")
	}
}

func TestValidateJWT_WrongSecret(t *testing.T) {
	now := time.Now().Unix()
	token := genToken("bar-1", now+300, []byte("wrong-secret"))

	_, err := ValidateJWT(token, []byte("my-secret"))
	if err == nil {
		t.Error("expected error for wrong secret")
	}
}

func TestValidateJWT_InvalidFormat(t *testing.T) {
	_, err := ValidateJWT("invalid-token", []byte("secret"))
	if err == nil {
		t.Error("expected error for invalid token format")
	}
}

func TestJWTMiddleware_MissingHeader(t *testing.T) {
	handler := JWT("test-secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestJWTMiddleware_InvalidFormat(t *testing.T) {
	handler := JWT("test-secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Authorization", "Basic credentials")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestJWTMiddleware_ValidToken(t *testing.T) {
	secret := "test-secret"
	now := time.Now().Unix()
	token := genToken("bar-123", now+300, []byte(secret))

	nextCalled := false
	handler := JWT(secret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if !nextCalled {
		t.Error("expected next handler to be called")
	}
}

func TestJWTMiddleware_OptionsPassthrough(t *testing.T) {
	nextCalled := false
	handler := JWT("secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !nextCalled {
		t.Error("expected OPTIONS to pass through to next handler")
	}
}

func TestValidateJWT_ChallengeEdgeCases(t *testing.T) {
	secret := []byte("my-secret")
	now := time.Now().Unix()

	genTokenCustom := func(headerStr, payloadStr string, sec []byte) string {
		h := base64.RawURLEncoding.EncodeToString([]byte(headerStr))
		p := base64.RawURLEncoding.EncodeToString([]byte(payloadStr))
		mac := hmac.New(sha256.New, sec)
		mac.Write([]byte(h + "." + p))
		s := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
		return h + "." + p + "." + s
	}

	tests := []struct {
		name        string
		token       string
		secret      []byte
		expectError bool
	}{
		{
			name:        "Valid token",
			token:       genTokenCustom(`{"alg":"HS256","typ":"JWT"}`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), secret),
			secret:      secret,
			expectError: false,
		},
		{
			name:        "Algorithm none",
			token:       genTokenCustom(`{"alg":"none","typ":"JWT"}`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Algorithm RS256",
			token:       genTokenCustom(`{"alg":"RS256","typ":"JWT"}`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Empty header JSON object",
			token:       genTokenCustom(`{}`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Header is array",
			token:       genTokenCustom(`[]`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Payload is array",
			token:       genTokenCustom(`{"alg":"HS256","typ":"JWT"}`, `[]`, secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Missing exp claim",
			token:       genTokenCustom(`{"alg":"HS256","typ":"JWT"}`, `{"barId":"bar-1"}`, secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Negative exp claim",
			token:       genTokenCustom(`{"alg":"HS256","typ":"JWT"}`, `{"barId":"bar-1","exp":-10}`, secret),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Malformed JWT format (2 parts)",
			token:       "header.payload",
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Malformed JWT format (4 parts)",
			token:       "header.payload.signature.extra",
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Base64 standard encoding with padding in signature",
			token:       base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`)) + "." + base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300))) + "." + base64.StdEncoding.EncodeToString(make([]byte, 32)),
			secret:      secret,
			expectError: true,
		},
		{
			name:        "Empty secret key verification",
			token:       genTokenCustom(`{"alg":"HS256","typ":"JWT"}`, fmt.Sprintf(`{"barId":"bar-1","iat":%d,"exp":%d}`, now, now+300), []byte("")),
			secret:      []byte(""),
			expectError: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ValidateJWT(tc.token, tc.secret)
			if (err != nil) != tc.expectError {
				t.Errorf("expected error: %t, got error: %v", tc.expectError, err)
			}
		})
	}
}

func TestJWTMiddleware_ExpiredToken(t *testing.T) {
	secret := "test-secret"
	now := time.Now().Unix()
	token := genToken("bar-1", now-10, []byte(secret))

	handler := JWT(secret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "expired") {
		t.Errorf("expected expired error message, got: %s", w.Body.String())
	}
}
