package main

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"printer-service/internal/usecase"
)

// MockPrinter implements domain.Printer for tests
type MockPrinter struct {
	ShouldFail bool
}

func (m *MockPrinter) Connect(ctx context.Context) error {
	if m.ShouldFail {
		return errors.New("mock connection error")
	}
	return nil
}

func (m *MockPrinter) Write(b []byte) (int, error) {
	if m.ShouldFail {
		return 0, errors.New("mock write error")
	}
	return len(b), nil
}

func (m *MockPrinter) Close() error {
	return nil
}

func TestSetupHandler_Options(t *testing.T) {
	printer := &MockPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	mux := SetupHandler(uc)

	req := httptest.NewRequest(http.MethodOptions, "/print", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 OK for OPTIONS, got %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("expected CORS headers")
	}
}

func TestSetupHandler_InvalidMethod(t *testing.T) {
	printer := &MockPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	mux := SetupHandler(uc)

	req := httptest.NewRequest(http.MethodGet, "/print", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 Method Not Allowed, got %d", w.Code)
	}
}

func TestSetupHandler_Success(t *testing.T) {
	printer := &MockPrinter{ShouldFail: false}
	uc := usecase.NewPrintTicketUseCase(printer)
	mux := SetupHandler(uc)

	body := []byte("test ticket content")
	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", w.Code)
	}
	if w.Body.String() != "{\"status\":\"ok\"}\n" {
		t.Errorf("unexpected body: %s", w.Body.String())
	}
}

func TestSetupHandler_PrinterError(t *testing.T) {
	printer := &MockPrinter{ShouldFail: true}
	uc := usecase.NewPrintTicketUseCase(printer)
	mux := SetupHandler(uc)

	body := []byte("test ticket content")
	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 Service Unavailable, got %d", w.Code)
	}
}

func TestBuildServer(t *testing.T) {
	// Test default args
	srv, err := BuildServer([]string{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if srv.Addr != ":8080" {
		t.Errorf("expected :8080 addr, got %s", srv.Addr)
	}

	// Test flag parsing error
	_, err = BuildServer([]string{"--invalid-flag"})
	if err == nil {
		t.Error("expected flag parse error")
	}

	// Test local flag
	srv, err = BuildServer([]string{"--local", "--port=9090"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if srv.Addr != ":9090" {
		t.Errorf("expected :9090 addr, got %s", srv.Addr)
	}

	// Test network printer type
	_, err = BuildServer([]string{"--printer-type=network", "--printer-path=localhost:9100"})
	if err != nil {
		t.Errorf("expected nil error, got %v", err)
	}
}
