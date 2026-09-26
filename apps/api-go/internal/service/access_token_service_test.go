package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"api-go/internal/core/domain"
)

const testSecret = "a-secret-nobody-else-has"

func newTestTokens(users *fakeUsers, cache *fakeCache) *AccessTokenService {
	return NewAccessTokenService(testSecret, users, cache)
}

func encodeSegment(t *testing.T, value any) string {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return base64.RawURLEncoding.EncodeToString(raw)
}

func TestAccessTokenReadsBackWhatItSigned(t *testing.T) {
	tokens := newTestTokens(newFakeUsers(), newFakeCache())

	token, err := tokens.Sign("user-1", "session-1")
	if err != nil {
		t.Fatal(err)
	}

	claims := tokens.Verify(token)
	if claims == nil || claims.Sub != "user-1" || claims.Sid != "session-1" {
		t.Fatalf("Verify = %+v", claims)
	}

	var payload struct {
		Iat int64  `json:"iat"`
		Exp int64  `json:"exp"`
		Iss string `json:"iss"`
	}
	raw, _ := base64.RawURLEncoding.DecodeString(strings.Split(token, ".")[1])
	json.Unmarshal(raw, &payload)

	if payload.Exp-payload.Iat != 15*60 {
		t.Errorf("token lasts %d seconds, want 900", payload.Exp-payload.Iat)
	}
	if payload.Iss != "coaster" {
		t.Errorf("iss = %q", payload.Iss)
	}
}

func TestAccessTokenVerify(t *testing.T) {
	tokens := newTestTokens(newFakeUsers(), newFakeCache())
	good, _ := tokens.Sign("user-1", "session-1")
	parts := strings.Split(good, ".")

	otherSecret, _ := NewAccessTokenService("a-different-secret", nil, nil).Sign("user-1", "session-1")

	foreignIssuer, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims{
		SessionID: "session-1",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "user-1", Issuer: "somebody-else", Audience: jwt.ClaimStrings{"coaster-api"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}).SignedString([]byte(testSecret))

	noSession, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "user-1", Issuer: "coaster", Audience: jwt.ClaimStrings{"coaster-api"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}).SignedString([]byte(testSecret))

	forged := parts[0] + "." + encodeSegment(t, map[string]any{"sub": "someone-else", "sid": "s", "iat": 0, "exp": 9999999999}) + "." + parts[2]
	noneAlgorithm := encodeSegment(t, map[string]string{"alg": "none", "typ": "JWT"}) + "." +
		encodeSegment(t, map[string]any{"sub": "user-1", "sid": "s", "iss": "coaster", "aud": "coaster-api", "exp": 9999999999}) + "."

	tests := []struct {
		name  string
		token string
		want  bool
	}{
		{name: "its own token", token: good, want: true},
		{name: "with the Bearer prefix", token: "Bearer " + good, want: true},
		{name: "with the prefix in lower case", token: "bearer " + good, want: true},
		{name: "payload edited after signing", token: forged},
		{name: "signed with another secret", token: otherSecret},
		{name: "no algorithm at all", token: noneAlgorithm},
		{name: "minted by another issuer", token: foreignIssuer},
		{name: "no session id", token: noSession},
		{name: "empty", token: ""},
		{name: "only the prefix", token: "Bearer "},
		{name: "not a token", token: "not.a.token"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tokens.Verify(tt.token) != nil; got != tt.want {
				t.Errorf("valid = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAccessTokenRejectsAnExpiredToken(t *testing.T) {
	tokens := newTestTokens(newFakeUsers(), newFakeCache())

	signedAt := time.Now()
	tokens.now = func() time.Time { return signedAt }
	token, _ := tokens.Sign("user-1", "session-1")

	tokens.now = func() time.Time { return signedAt.Add(16 * time.Minute) }

	if tokens.Verify(token) != nil {
		t.Error("an expired token verified")
	}
}

func TestAccessTokenReadsNestTokens(t *testing.T) {
	// A token as jose writes it: the audience is a string, not an array.
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sid": "session-1", "sub": "user-1", "iss": "coaster", "aud": "coaster-api",
		"iat": time.Now().Unix(), "exp": time.Now().Add(15 * time.Minute).Unix(),
	}).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}

	claims := newTestTokens(newFakeUsers(), newFakeCache()).Verify(token)
	if claims == nil || claims.Sid != "session-1" {
		t.Errorf("Verify = %+v", claims)
	}
}

func TestResolveLoadsTheUserBehindTheCache(t *testing.T) {
	users := newFakeUsers(domain.AuthUser{ID: "user-1", Email: "a@b.c", Name: "Ana", Active: true, Role: domain.RoleUser})
	cache := newFakeCache()
	tokens := newTestTokens(users, cache)
	token, _ := tokens.Sign("user-1", "session-1")

	caller, err := tokens.Resolve(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}
	if caller == nil || caller.User == nil || caller.User.Email != "a@b.c" || caller.Claims.Sid != "session-1" {
		t.Fatalf("Resolve = %+v", caller)
	}

	if _, ok := cache.values["user:user-1"]; !ok {
		t.Error("the user was not cached under user:user-1")
	}

	tokens.Resolve(context.Background(), token)
	if users.lookups != 1 {
		t.Errorf("the database was asked %d times, want 1", users.lookups)
	}
}

func TestResolveNeverCachesThePasswordHash(t *testing.T) {
	hash := "$argon2id$v=19$secret"
	users := newFakeUsers(domain.AuthUser{ID: "user-1", Email: "a@b.c", Active: true, PasswordHash: &hash})
	cache := newFakeCache()
	tokens := newTestTokens(users, cache)
	token, _ := tokens.Sign("user-1", "session-1")

	tokens.Resolve(context.Background(), token)

	if strings.Contains(string(cache.values["user:user-1"]), "argon2") {
		t.Errorf("the cached user holds the password hash: %s", cache.values["user:user-1"])
	}
}

func TestResolveReadsWhatNestCached(t *testing.T) {
	cache := newFakeCache()
	cache.values["user:user-1"] = []byte(`{"id":"user-1","email":"a@b.c","firebaseUid":null,"passwordUpdatedAt":null,"emailVerifiedAt":"2026-09-01T10:00:00.000Z","name":"Ana","photoUrl":null,"active":true,"role":"ADMIN","createdAt":"2026-09-01T10:00:00.000Z","updatedAt":"2026-09-01T10:00:00.000Z","preferences":{"id":"p1","userId":"user-1","language":"en"}}`)
	tokens := newTestTokens(newFakeUsers(), cache)
	token, _ := tokens.Sign("user-1", "session-1")

	caller, err := tokens.Resolve(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}

	want := domain.User{ID: "user-1", Email: "a@b.c", Name: "Ana", Active: true, Role: domain.RoleAdmin, Language: "en", EmailVerified: true}
	if caller.User == nil || *caller.User != want {
		t.Errorf("user = %+v, want %+v", caller.User, want)
	}
}

func TestResolveDoesNotTouchTheDatabaseForABadToken(t *testing.T) {
	users := newFakeUsers()
	caller, err := newTestTokens(users, newFakeCache()).Resolve(context.Background(), "not.a.token")

	if caller != nil || err != nil {
		t.Errorf("Resolve = %+v, %v", caller, err)
	}
	if users.lookups != 0 {
		t.Error("the database was asked about a token that does not verify")
	}
}

func TestResolveOfAUserThatNoLongerExists(t *testing.T) {
	tokens := newTestTokens(newFakeUsers(), newFakeCache())
	token, _ := tokens.Sign("gone", "session-1")

	caller, err := tokens.Resolve(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}
	if caller == nil || caller.User != nil {
		t.Errorf("Resolve = %+v, want claims and no user", caller)
	}
}

func TestStripBearer(t *testing.T) {
	tests := map[string]string{
		"bearer abc":  "abc",
		"Bearer abc":  "abc",
		"BEARER  abc": "abc",
		"abc":         "abc",
		"Bearerabc":   "Bearerabc",
		"Bearer ":     "",
		"":            "",
	}

	for input, want := range tests {
		if got := stripBearer(input); got != want {
			t.Errorf("stripBearer(%q) = %q, want %q", input, got, want)
		}
	}
}
