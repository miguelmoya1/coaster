package domain

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"
)

// Refresh tokens: the cookie lasts 30 days, and a rotated token still works for 30 seconds
// so two tabs refreshing at once do not sign each other out.
const (
	RefreshTokenTTL    = 30 * 24 * time.Hour
	RefreshReuseGrace  = 30 * time.Second
	authTokenByteCount = 32
)

// authTokenLifetimes is how long each emailed token lasts.
var authTokenLifetimes = map[AuthTokenPurpose]time.Duration{
	AuthTokenEmailVerification: 24 * time.Hour,
	AuthTokenPasswordReset:     time.Hour,
	AuthTokenInvite:            7 * 24 * time.Hour,
}

// NewAuthToken returns 256 random bits in base64url, for an emailed link.
func NewAuthToken() string {
	return randomToken()
}

// HashAuthToken is what the database stores: plain sha256, because the token is random
// and only needs to be looked up.
func HashAuthToken(token string) string {
	return sha256Hex(token)
}

// AuthTokenExpiry is when a token issued now for purpose stops working.
func AuthTokenExpiry(purpose AuthTokenPurpose, now time.Time) time.Time {
	return now.Add(authTokenLifetimes[purpose])
}

// NewRefreshToken returns 256 random bits in base64url, for the session cookie.
func NewRefreshToken() string {
	return randomToken()
}

// HashRefreshToken is what the AuthSession table stores.
func HashRefreshToken(token string) string {
	return sha256Hex(token)
}

// RefreshExpiryFrom is when a refresh token issued now expires.
func RefreshExpiryFrom(now time.Time) time.Time {
	return now.Add(RefreshTokenTTL)
}

// IsWithinReuseGrace reports whether a token rotated at rotatedAt can still be used.
func IsWithinReuseGrace(rotatedAt, now time.Time) bool {
	return now.Sub(rotatedAt) <= RefreshReuseGrace
}

func randomToken() string {
	bytes := make([]byte, authTokenByteCount)
	rand.Read(bytes)
	return base64.RawURLEncoding.EncodeToString(bytes)
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
