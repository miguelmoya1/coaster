package domain

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"
)

const (
	RefreshTokenTTL    = 30 * 24 * time.Hour
	RefreshReuseGrace  = 30 * time.Second
	authTokenByteCount = 32
)

var authTokenLifetimes = map[AuthTokenPurpose]time.Duration{
	AuthTokenEmailVerification: 24 * time.Hour,
	AuthTokenPasswordReset:     time.Hour,
	AuthTokenInvite:            7 * 24 * time.Hour,
}

func NewAuthToken() string {
	return randomToken()
}

func HashAuthToken(token string) string {
	return sha256Hex(token)
}

func AuthTokenExpiry(purpose AuthTokenPurpose, now time.Time) time.Time {
	return now.Add(authTokenLifetimes[purpose])
}

func NewRefreshToken() string {
	return randomToken()
}

func HashRefreshToken(token string) string {
	return sha256Hex(token)
}

func RefreshExpiryFrom(now time.Time) time.Time {
	return now.Add(RefreshTokenTTL)
}

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

type Caller struct {
	Claims SessionClaims
	User   *User
}
