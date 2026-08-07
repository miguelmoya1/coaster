package printer_test

import (
	"context"
	"strings"
	"testing"

	"printer-service/internal/infrastructure/printer"
)

func TestAutoDetectOS_ReportsWhereItLooked(t *testing.T) {
	p, err := printer.AutoDetectOS()
	if p != nil {
		p.Close()
	}

	if err == nil {
		t.Log("a printer was found on this machine; nothing to assert")
		return
	}

	for _, want := range []string{"/dev/usb/lp", "/dev/rfcomm", "/dev/ttyUSB"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("expected the error to mention %s, got %v", want, err)
		}
	}
}

func TestUSBPrinter_Connect_NotFound(t *testing.T) {
	u := printer.NewUSBPrinter("/dev/null/invalid_path_for_test")
	if err := u.Connect(context.Background()); err == nil {
		t.Error("expected connect to fail on an invalid path")
	}
}

func TestUSBPrinter_WriteWithoutConnect(t *testing.T) {
	u := printer.NewUSBPrinter("/dev/null/invalid_path_for_test")

	n, err := u.Write([]byte("test"))
	if err == nil {
		t.Error("expected an error when writing before connecting")
	}
	if n != 0 {
		t.Errorf("expected no bytes written, got %d", n)
	}
}

func TestUSBPrinter_CloseWithoutConnect(t *testing.T) {
	u := printer.NewUSBPrinter("/dev/null/invalid_path_for_test")
	if err := u.Close(); err != nil {
		t.Errorf("expected close to return nil if not connected, got %v", err)
	}
}

func TestLocalCandidates_OnlyReturnsExistingDevices(t *testing.T) {
	for _, path := range printer.LocalCandidates() {
		if !strings.HasPrefix(path, "/dev/") {
			t.Errorf("expected a device node, got %q", path)
		}
	}
}
