package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

type testPrinter struct {
	shouldFail bool
	written    []byte
}

func (p *testPrinter) Connect(ctx context.Context) error {
	if p.shouldFail {
		return errors.New("mock connection error")
	}
	return nil
}

func (p *testPrinter) Write(b []byte) (int, error) {
	if p.shouldFail {
		return 0, errors.New("mock write error")
	}
	p.written = append(p.written, b...)
	return len(b), nil
}

func (p *testPrinter) Close() error {
	return nil
}

func TestPrintHandler_Success(t *testing.T) {
	printer := &testPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	handler := NewPrintHandler(uc)

	body := []byte("plain text ticket")
	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %s", resp["status"])
	}


	if string(printer.written) != "plain text ticket" {
		t.Errorf("expected raw bytes, got %q", string(printer.written))
	}
}

func TestPrintHandler_JSONPayload(t *testing.T) {
	printer := &testPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	handler := NewPrintHandler(uc)

	payload := escpos.TicketPayload{
		Type:    "order",
		BarName: "Test Bar",
		Table:   "3",
		Items: []escpos.TicketItem{
			{Name: "Beer", Quantity: 2, Price: "4.00", Total: "8.00"},
		},
		Total: "8.00",
	}
	bodyBytes, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(bodyBytes))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}


	if !bytes.HasPrefix(printer.written, escpos.Init) {
		t.Error("expected ESC/POS rendered content")
	}
}

func TestPrintHandler_PrinterError(t *testing.T) {
	printer := &testPrinter{shouldFail: true}
	uc := usecase.NewPrintTicketUseCase(printer)
	handler := NewPrintHandler(uc)

	req := httptest.NewRequest(http.MethodPost, "/print", strings.NewReader("test"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestPrintHandler_MethodNotAllowed(t *testing.T) {
	printer := &testPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	handler := NewPrintHandler(uc)

	req := httptest.NewRequest(http.MethodGet, "/print", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestPrintHandler_RawTypePayload(t *testing.T) {
	printer := &testPrinter{}
	uc := usecase.NewPrintTicketUseCase(printer)
	handler := NewPrintHandler(uc)

	payload := escpos.TicketPayload{
		Type:    "raw",
		RawText: "Raw ESC data",
	}
	bodyBytes, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(bodyBytes))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	if !bytes.Contains(printer.written, []byte("Raw ESC data")) {
		t.Error("expected raw text in output")
	}
}
