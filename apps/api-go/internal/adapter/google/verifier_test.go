package google

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

const clientID = "1234567890-abcdefg.apps.googleusercontent.com"

func encodeSegment(t *testing.T, value any) string {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return base64.RawURLEncoding.EncodeToString(raw)
}

func sign(t *testing.T, key *rsa.PrivateKey, header, claims map[string]any) string {
	t.Helper()
	input := encodeSegment(t, header) + "." + encodeSegment(t, claims)
	digest := sha256.Sum256([]byte(input))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	return input + "." + base64.RawURLEncoding.EncodeToString(signature)
}

func validClaims(overrides map[string]any) map[string]any {
	claims := map[string]any{
		"iss":            "https://accounts.google.com",
		"aud":            clientID,
		"sub":            "110000000000000000001",
		"iat":            time.Now().Unix(),
		"exp":            time.Now().Add(time.Hour).Unix(),
		"email":          "Someone@Coaster.test",
		"email_verified": true,
		"name":           "Someone",
		"picture":        "https://lh3.googleusercontent.com/a/photo",
	}
	for key, value := range overrides {
		if value == nil {
			delete(claims, key)
			continue
		}
		claims[key] = value
	}
	return claims
}

func newKeyServer(t *testing.T, key *rsa.PrivateKey, calls *atomic.Int32) *httptest.Server {
	t.Helper()
	jwk := map[string]any{
		"kty": "RSA", "alg": "RS256", "use": "sig", "kid": "the-key",
		"n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
		"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		json.NewEncoder(w).Encode(map[string]any{"keys": []any{jwk}})
	}))
	t.Cleanup(server.Close)
	return server
}

func TestVerifier(t *testing.T) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	other, _ := rsa.GenerateKey(rand.Reader, 2048)
	var calls atomic.Int32
	server := newKeyServer(t, key, &calls)

	verifier, err := NewVerifier(context.Background(), clientID, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if !verifier.Configured() {
		t.Fatalf("a verifier with a client id must be configured")
	}

	rs256 := map[string]any{"alg": "RS256", "typ": "JWT", "kid": "the-key"}

	identity := verifier.Verify(context.Background(), sign(t, key, rs256, validClaims(nil)))
	if identity == nil || identity.Subject != "110000000000000000001" || identity.Email != "someone@coaster.test" ||
		identity.Name != "Someone" || identity.Picture == nil {
		t.Fatalf("Verify of a good token = %+v", identity)
	}

	refused := []struct {
		name  string
		token string
	}{
		{name: "signed by somebody else", token: sign(t, other, rs256, validClaims(nil))},
		{name: "another client", token: sign(t, key, rs256, validClaims(map[string]any{"aud": "another-client.apps.googleusercontent.com"}))},
		{name: "another issuer", token: sign(t, key, rs256, validClaims(map[string]any{"iss": "https://accounts.evil.example"}))},
		{name: "expired", token: sign(t, key, rs256, validClaims(map[string]any{"exp": time.Now().Unix() - 1}))},
		{name: "not yet valid", token: sign(t, key, rs256, validClaims(map[string]any{"nbf": time.Now().Add(time.Hour).Unix()}))},
		{name: "address not verified", token: sign(t, key, rs256, validClaims(map[string]any{"email_verified": false}))},
		{name: "no address", token: sign(t, key, rs256, validClaims(map[string]any{"email": nil}))},
		{name: "alg none", token: encodeSegment(t, map[string]any{"alg": "none", "kid": "the-key"}) + "." + encodeSegment(t, validClaims(nil)) + "."},
		{name: "unknown key", token: sign(t, key, map[string]any{"alg": "RS256", "kid": "a-key-nobody-published"}, validClaims(nil))},
		{name: "empty", token: ""},
		{name: "not a token", token: "not.a.token"},
	}
	for _, tt := range refused {
		if got := verifier.Verify(context.Background(), tt.token); got != nil {
			t.Errorf("%s: Verify = %+v, want nil", tt.name, got)
		}
	}

	if got := verifier.Verify(context.Background(), sign(t, key, rs256, validClaims(map[string]any{"email_verified": "true"}))); got == nil {
		t.Errorf("email_verified as the string true must be accepted")
	}

	if calls.Load() != 1 {
		t.Errorf("the keys were read %d times, want once", calls.Load())
	}
}

func TestVerifierWithoutClientID(t *testing.T) {
	verifier, err := NewVerifier(context.Background(), "", "")
	if err != nil {
		t.Fatal(err)
	}
	if verifier.Configured() {
		t.Fatalf("a verifier without a client id must not be configured")
	}
	if verifier.Verify(context.Background(), "a.b.c") != nil {
		t.Fatalf("Verify without a client id must be nil")
	}
}

func TestVerifierWhenGoogleCannotBeReached(t *testing.T) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	verifier, err := NewVerifier(context.Background(), clientID, server.URL)
	if err != nil {
		t.Fatal(err)
	}

	token := sign(t, key, map[string]any{"alg": "RS256", "kid": "the-key"}, validClaims(nil))
	if verifier.Verify(context.Background(), token) != nil {
		t.Fatalf("Verify must be nil when the keys cannot be read")
	}
}
