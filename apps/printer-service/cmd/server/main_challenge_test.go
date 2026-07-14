package main

import (
	"testing"
)

func TestBuildServer_AllowedOrigins(t *testing.T) {
	srv, err := BuildServer([]string{
		"--allowed-origins=https://a.com,https://b.com",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if srv.Addr != ":8080" {
		t.Errorf("expected :8080, got %s", srv.Addr)
	}
}

func TestBuildServer_NetworkPrinterDefaultPath(t *testing.T) {
	srv, err := BuildServer([]string{
		"--printer-type=network",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if srv == nil {
		t.Error("expected non-nil server")
	}
}

func TestBuildServer_USBPrinterWithPath(t *testing.T) {
	srv, err := BuildServer([]string{
		"--printer-path=/dev/usb/lp0",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if srv == nil {
		t.Error("expected non-nil server")
	}
}
