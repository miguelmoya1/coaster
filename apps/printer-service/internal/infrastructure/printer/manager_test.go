package printer_test

import (
	"context"
	"strings"
	"testing"

	"printer-service/internal/domain"
	"printer-service/internal/infrastructure/printer"
)

func TestAutoPrinter_WriteWithoutConnect(t *testing.T) {
	ap := printer.NewAutoPrinter()

	_, err := ap.Write([]byte("test"))
	if err == nil {
		t.Errorf("expected error when writing without connect, got nil")
	} else if !strings.Contains(err.Error(), "printer not connected") {
		t.Errorf("expected 'printer not connected' error, got %v", err)
	}
}

func TestAutoPrinter_CloseWithoutConnect(t *testing.T) {
	ap := printer.NewAutoPrinter()

	err := ap.Close()
	if err != nil {
		t.Errorf("expected no error when closing unconnected printer, got: %v", err)
	}
}

func TestAutoPrinter_ConnectSuccess(t *testing.T) {
	// Mock AutoDetectFunc
	original := printer.AutoDetectFunc
	defer func() { printer.AutoDetectFunc = original }()

	printer.AutoDetectFunc = func() (domain.Printer, error) {
		return &domain.MockPrinter{
			ConnectFunc: func(ctx context.Context) error { return nil },
			WriteFunc:   func(b []byte) (int, error) { return len(b), nil },
			CloseFunc:   func() error { return nil },
		}, nil
	}

	ap := printer.NewAutoPrinter()
	err := ap.Connect(context.Background())
	if err != nil {
		t.Fatalf("expected connect to succeed, got %v", err)
	}

	n, err := ap.Write([]byte("test"))
	if err != nil || n != 4 {
		t.Errorf("expected write to succeed with 4 bytes, got n=%d, err=%v", n, err)
	}

	err = ap.Close()
	if err != nil {
		t.Errorf("expected close to succeed, got %v", err)
	}
}
