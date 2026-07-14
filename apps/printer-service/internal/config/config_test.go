package config

import (
	"os"
	"testing"
)

func TestParse_Defaults(t *testing.T) {
	cfg, err := Parse([]string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("expected port 8080, got %s", cfg.Port)
	}
	if cfg.PrinterType != "usb" {
		t.Errorf("expected printer-type usb, got %s", cfg.PrinterType)
	}
	if cfg.APIURL != "https://api-774617138158.europe-southwest1.run.app/api/v1" {
		t.Errorf("unexpected default API URL: %s", cfg.APIURL)
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Errorf("expected 2 default origins, got %d", len(cfg.AllowedOrigins))
	}
}

func TestParse_FlagOverrides(t *testing.T) {
	cfg, err := Parse([]string{
		"--port=9090",
		"--printer-type=network",
		"--printer-path=10.0.0.1:9100",
		"--bar-id=bar-abc",
		"--device-key=key-xyz",
		"--jwt-secret=s3cret",
		"--allowed-origins=https://example.com",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.Port)
	}
	if cfg.PrinterType != "network" {
		t.Errorf("expected network, got %s", cfg.PrinterType)
	}
	if cfg.PrinterPath != "10.0.0.1:9100" {
		t.Errorf("expected 10.0.0.1:9100, got %s", cfg.PrinterPath)
	}
	if cfg.BarID != "bar-abc" {
		t.Errorf("expected bar-abc, got %s", cfg.BarID)
	}
	if cfg.DeviceKey != "key-xyz" {
		t.Errorf("expected key-xyz, got %s", cfg.DeviceKey)
	}
	if cfg.JWTSecret != "s3cret" {
		t.Errorf("expected s3cret, got %s", cfg.JWTSecret)
	}
	if len(cfg.AllowedOrigins) != 1 || cfg.AllowedOrigins[0] != "https://example.com" {
		t.Errorf("unexpected origins: %v", cfg.AllowedOrigins)
	}
}

func TestParse_LocalFlag(t *testing.T) {
	cfg, err := Parse([]string{"--local"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.APIURL != "http://localhost:3000/api/v1" {
		t.Errorf("expected local API URL, got %s", cfg.APIURL)
	}
}

func TestParse_EnvVarFallback(t *testing.T) {
	os.Setenv("BAR_ID", "env-bar")
	os.Setenv("PRINTER_DEVICE_KEY", "env-key")
	os.Setenv("PRINTER_IP_ADDRESS", "10.10.10.10")
	os.Setenv("PRINTER_JWT_SECRET", "env-secret")
	defer func() {
		os.Unsetenv("BAR_ID")
		os.Unsetenv("PRINTER_DEVICE_KEY")
		os.Unsetenv("PRINTER_IP_ADDRESS")
		os.Unsetenv("PRINTER_JWT_SECRET")
	}()

	cfg, err := Parse([]string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.BarID != "env-bar" {
		t.Errorf("expected env-bar, got %s", cfg.BarID)
	}
	if cfg.DeviceKey != "env-key" {
		t.Errorf("expected env-key, got %s", cfg.DeviceKey)
	}
	if cfg.IPAddress != "10.10.10.10" {
		t.Errorf("expected 10.10.10.10, got %s", cfg.IPAddress)
	}
	if cfg.JWTSecret != "env-secret" {
		t.Errorf("expected env-secret, got %s", cfg.JWTSecret)
	}
}

func TestParse_FlagOverridesEnv(t *testing.T) {
	os.Setenv("BAR_ID", "env-bar")
	defer os.Unsetenv("BAR_ID")

	cfg, err := Parse([]string{"--bar-id=flag-bar"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.BarID != "flag-bar" {
		t.Errorf("expected flag-bar to override env, got %s", cfg.BarID)
	}
}

func TestParse_InvalidFlag(t *testing.T) {
	_, err := Parse([]string{"--invalid-flag"})
	if err == nil {
		t.Error("expected error for invalid flag")
	}
}

func TestParseOrigins(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"https://a.com,https://b.com", []string{"https://a.com", "https://b.com"}},
		{"https://a.com , https://b.com ", []string{"https://a.com", "https://b.com"}},
		{"", []string{}},
		{"https://only.com", []string{"https://only.com"}},
	}
	for _, tc := range tests {
		result := parseOrigins(tc.input)
		if len(result) != len(tc.expected) {
			t.Errorf("parseOrigins(%q): expected %d items, got %d", tc.input, len(tc.expected), len(result))
			continue
		}
		for i, v := range result {
			if v != tc.expected[i] {
				t.Errorf("parseOrigins(%q)[%d]: expected %q, got %q", tc.input, i, tc.expected[i], v)
			}
		}
	}
}
