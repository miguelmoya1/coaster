package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

type testPrinter struct {
	mu         sync.Mutex
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
	p.mu.Lock()
	defer p.mu.Unlock()
	p.written = append(p.written, b...)
	return len(b), nil
}

func (p *testPrinter) Close() error { return nil }

func (p *testPrinter) bytes() []byte {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]byte{}, p.written...)
}

func newHandler(p *testPrinter) http.Handler {
	return NewPrintHandler(usecase.NewPrintTicketUseCase(p), escpos.NewRenderer(escpos.Width58mm, escpos.CP858))
}

func post(t *testing.T, h http.Handler, body []byte, contentType string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/print", bytes.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

func TestPrintHandler_PlainTextIsRenderedAsATicket(t *testing.T) {
	printer := &testPrinter{}
	w := post(t, newHandler(printer), []byte("plain text ticket"), "text/plain")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %s", resp["status"])
	}

	written := printer.bytes()
	if !bytes.Contains(written, []byte("plain text ticket")) {
		t.Errorf("expected the text in the output, got %q", written)
	}
	if !bytes.HasPrefix(written, escpos.Init) {
		t.Error("expected the printer to be initialised")
	}
	if !bytes.HasSuffix(written, escpos.FeedAndCut) {
		t.Error("expected the paper to be cut")
	}
}

func TestPrintHandler_PassesRawBytesThroughOnRequest(t *testing.T) {
	printer := &testPrinter{}
	raw := []byte{0x1B, 0x40, 'h', 'i'}

	w := post(t, newHandler(printer), raw, "application/octet-stream")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !bytes.Equal(printer.bytes(), raw) {
		t.Errorf("expected the bytes untouched, got % x", printer.bytes())
	}
}

func TestPrintHandler_JSONPayload(t *testing.T) {
	printer := &testPrinter{}
	body, _ := json.Marshal(escpos.TicketPayload{
		Type:              "order",
		EstablishmentName: "Test Establishment",
		Table:             "3",
		Items:             []escpos.TicketItem{{Name: "Beer", Quantity: 2, Price: "4.00", Total: "8.00"}},
		Total:             "8.00",
	})

	w := post(t, newHandler(printer), body, "application/json")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !bytes.HasPrefix(printer.bytes(), escpos.Init) {
		t.Error("expected ESC/POS rendered content")
	}
}

func TestPrintHandler_RawTypePayload(t *testing.T) {
	printer := &testPrinter{}
	body, _ := json.Marshal(escpos.TicketPayload{Type: "raw", RawText: "Raw ESC data"})

	w := post(t, newHandler(printer), body, "application/json")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !bytes.Contains(printer.bytes(), []byte("Raw ESC data")) {
		t.Error("expected raw text in output")
	}
}

func TestPrintHandler_PrinterError(t *testing.T) {
	w := post(t, newHandler(&testPrinter{shouldFail: true}), []byte("test"), "text/plain")

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestPrintHandler_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/print", nil)
	w := httptest.NewRecorder()
	newHandler(&testPrinter{}).ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
	if w.Header().Get("Allow") != http.MethodPost {
		t.Errorf("expected an Allow header, got %q", w.Header().Get("Allow"))
	}
}

func TestPrintHandler_RejectsAnOversizedBody(t *testing.T) {
	w := post(t, newHandler(&testPrinter{}), bytes.Repeat([]byte("A"), MaxTicketBytes+1), "text/plain")

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", w.Code)
	}
}

func TestPrintHandler_RejectsAnEmptyBody(t *testing.T) {
	w := post(t, newHandler(&testPrinter{}), nil, "application/octet-stream")

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected the empty ticket to be refused, got %d", w.Code)
	}
}

func TestPrintHandler_SerialisesConcurrentTickets(t *testing.T) {
	printer := &testPrinter{}
	h := newHandler(printer)

	const tickets = 8
	var wg sync.WaitGroup
	for range tickets {
		wg.Add(1)
		go func() {
			defer wg.Done()
			post(t, h, []byte("ticket"), "application/octet-stream")
		}()
	}
	wg.Wait()

	written := string(printer.bytes())
	if want := strings.Repeat("ticket", tickets); written != want {
		t.Errorf("expected %d intact tickets, got %q", tickets, written)
	}
}
