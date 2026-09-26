package config

import (
	"slices"
	"testing"
)

func TestLoadRequiresDatabaseURLAndJWTSecret(t *testing.T) {
	tests := []struct {
		name        string
		databaseURL string
		jwtSecret   string
		wantErr     bool
	}{
		{name: "both set", databaseURL: "postgres://db", jwtSecret: "secret"},
		{name: "no DATABASE_URL", jwtSecret: "secret", wantErr: true},
		{name: "no AUTH_JWT_SECRET", databaseURL: "postgres://db", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("DATABASE_URL", tt.databaseURL)
			t.Setenv("AUTH_JWT_SECRET", tt.jwtSecret)

			_, err := Load()
			if (err != nil) != tt.wantErr {
				t.Errorf("err = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://db")
	t.Setenv("AUTH_JWT_SECRET", "secret")
	t.Setenv("FRONTEND_URL", "https://coaster.business/")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}

	if cfg.Port != "3000" {
		t.Errorf("Port = %q, want 3000", cfg.Port)
	}
	if cfg.EmailFrom != "Coaster <hello@coaster.business>" {
		t.Errorf("EmailFrom = %q", cfg.EmailFrom)
	}
	if cfg.FrontendURL != "https://coaster.business" {
		t.Errorf("FrontendURL = %q, want it without the trailing slash", cfg.FrontendURL)
	}
	if !cfg.PwnedPasswordsEnabled {
		t.Error("PwnedPasswordsEnabled should default to true")
	}
}

func TestCORSOrigins(t *testing.T) {
	tests := []struct {
		name         string
		value        string
		isProduction bool
		want         []string
	}{
		{name: "list", value: " https://a.com, ,https://b.com ", want: []string{"https://a.com", "https://b.com"}},
		{name: "unset in development", want: []string{"http://localhost:4200"}},
		{name: "unset in production fails closed", isProduction: true, want: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := corsOrigins(tt.value, tt.isProduction); !slices.Equal(got, tt.want) {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestTrustProxyHops(t *testing.T) {
	tests := []struct {
		value string
		isSet bool
		want  int
	}{
		{isSet: false, want: 1},
		{value: "", isSet: true, want: 0},
		{value: "0", isSet: true, want: 0},
		{value: "2", isSet: true, want: 2},
		{value: "abc", isSet: true, want: 0},
	}

	for _, tt := range tests {
		if got := trustProxyHops(tt.value, tt.isSet); got != tt.want {
			t.Errorf("trustProxyHops(%q, %v) = %d, want %d", tt.value, tt.isSet, got, tt.want)
		}
	}
}
