package domain

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"testing"
	"time"
)

func TestNewTokensAre256RandomBits(t *testing.T) {
	for name, newToken := range map[string]func() string{"auth": NewAuthToken, "refresh": NewRefreshToken} {
		t.Run(name, func(t *testing.T) {
			first := newToken()

			raw, err := base64.RawURLEncoding.DecodeString(first)
			if err != nil {
				t.Fatalf("not base64url: %v", err)
			}
			if len(raw) != 32 {
				t.Errorf("got %d bytes, want 32", len(raw))
			}
			if newToken() == first {
				t.Error("two tokens in a row are the same")
			}
		})
	}
}

func TestTokenHashesArePlainSHA256(t *testing.T) {
	sum := sha256.Sum256([]byte("a-token"))
	want := hex.EncodeToString(sum[:])

	if got := HashAuthToken("a-token"); got != want {
		t.Errorf("HashAuthToken = %s, want %s", got, want)
	}
	if got := HashRefreshToken("a-token"); got != want {
		t.Errorf("HashRefreshToken = %s, want %s", got, want)
	}
	if HashAuthToken("a-token") != HashAuthToken("a-token") {
		t.Error("the same token hashed to two values")
	}
}

func TestAuthTokenExpiry(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		purpose AuthTokenPurpose
		want    time.Duration
	}{
		{AuthTokenEmailVerification, 24 * time.Hour},
		{AuthTokenPasswordReset, time.Hour},
		{AuthTokenInvite, 7 * 24 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(string(tt.purpose), func(t *testing.T) {
			if got := AuthTokenExpiry(tt.purpose, now).Sub(now); got != tt.want {
				t.Errorf("lifetime = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRefreshWindows(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

	if got := RefreshExpiryFrom(now).Sub(now); got != 30*24*time.Hour {
		t.Errorf("refresh lifetime = %v, want 30 days", got)
	}

	tests := []struct {
		name      string
		rotatedAt time.Time
		want      bool
	}{
		{name: "just rotated", rotatedAt: now, want: true},
		{name: "on the edge", rotatedAt: now.Add(-30 * time.Second), want: true},
		{name: "past the grace", rotatedAt: now.Add(-31 * time.Second), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsWithinReuseGrace(tt.rotatedAt, now); got != tt.want {
				t.Errorf("IsWithinReuseGrace = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAuthUserToUser(t *testing.T) {
	photo := "https://example.com/me.png"
	english := "en"
	verified := time.Now()
	hash := "$argon2id$..."

	tests := []struct {
		name string
		user AuthUser
		want User
	}{
		{
			name: "no preferences falls back to Spanish",
			user: AuthUser{ID: "u1", Email: "a@b.c", Name: "Ana", Active: true, Role: RoleUser, PasswordHash: &hash},
			want: User{ID: "u1", Email: "a@b.c", Name: "Ana", Active: true, Role: RoleUser, Language: "es"},
		},
		{
			name: "everything set",
			user: AuthUser{ID: "u1", Email: "a@b.c", Name: "Ana", PhotoURL: &photo, Active: true, Role: RoleAdmin, Language: &english, EmailVerifiedAt: &verified},
			want: User{ID: "u1", Email: "a@b.c", Name: "Ana", PhotoURL: &photo, Active: true, Role: RoleAdmin, Language: "en", EmailVerified: true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.user.ToUser()
			if got.ID != tt.want.ID || got.Language != tt.want.Language || got.EmailVerified != tt.want.EmailVerified ||
				got.Role != tt.want.Role || got.PhotoURL != tt.want.PhotoURL || got.Active != tt.want.Active {
				t.Errorf("ToUser() = %+v, want %+v", got, tt.want)
			}
		})
	}
}
