package relay

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"printer-service/internal/config"
	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

type recordingPrinter struct {
	mu      sync.Mutex
	written [][]byte
	fail    error
}

func (p *recordingPrinter) Connect(ctx context.Context) error { return p.fail }

func (p *recordingPrinter) Write(b []byte) (int, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.written = append(p.written, append([]byte{}, b...))
	return len(b), nil
}

func (p *recordingPrinter) Close() error { return nil }

func (p *recordingPrinter) jobs() [][]byte {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([][]byte{}, p.written...)
}

func testConfig(baseURL string) *config.Config {
	return &config.Config{
		APIURL:          baseURL,
		EstablishmentID: "establishment-123",
		DeviceKey:       "key-xyz",
		PollInterval:    time.Millisecond,
	}
}

func TestNextJob_ReturnsAQueuedJob(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Device-Key"); got != "key-xyz" {
			t.Errorf("expected the device key to be sent, got %q", got)
		}
		if got := r.URL.Query().Get("establishmentId"); got != "establishment-123" {
			t.Errorf("expected the establishment id in the query, got %q", got)
		}
		json.NewEncoder(w).Encode(Job{
			ID:      "job-1",
			Payload: escpos.TicketPayload{Type: "order", EstablishmentName: "Establishment Central"},
		})
	}))
	defer server.Close()

	job, err := NewClient(testConfig(server.URL)).NextJob(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if job == nil || job.ID != "job-1" {
		t.Fatalf("expected job-1, got %+v", job)
	}
	if job.Payload.EstablishmentName != "Establishment Central" {
		t.Errorf("expected the payload to be decoded, got %+v", job.Payload)
	}
}

func TestNextJob_NoContentIsNotAnError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	job, err := NewClient(testConfig(server.URL)).NextJob(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if job != nil {
		t.Errorf("expected no job, got %+v", job)
	}
}

func TestNextJob_FlagsARejectedDeviceKey(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(status)
		}))

		_, err := NewClient(testConfig(server.URL)).NextJob(context.Background())
		if !errors.Is(err, errUnauthorized) {
			t.Errorf("status %d: expected errUnauthorized, got %v", status, err)
		}
		server.Close()
	}
}

func TestNextJob_RejectsAJobWithoutAnID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"payload":{"type":"order"}}`))
	}))
	defer server.Close()

	if _, err := NewClient(testConfig(server.URL)).NextJob(context.Background()); err == nil {
		t.Error("expected an error for a job with no id")
	}
}

func TestRun_PrintsAJobAndReportsSuccess(t *testing.T) {
	var (
		mu       sync.Mutex
		served   bool
		reported map[string]string
	)

	done := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/printer/jobs/next":
			mu.Lock()
			defer mu.Unlock()
			if served {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			served = true
			json.NewEncoder(w).Encode(Job{
				ID:      "job-1",
				Payload: escpos.TicketPayload{Type: "order", EstablishmentName: "Establishment Central", Total: "9.00"},
			})

		case r.URL.Path == "/printer/jobs/job-1/result":
			mu.Lock()
			json.NewDecoder(r.Body).Decode(&reported)
			mu.Unlock()
			close(done)

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	printer := &recordingPrinter{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go Run(ctx, testConfig(server.URL),
		usecase.NewPrintTicketUseCase(printer),
		escpos.NewRenderer(escpos.Width58mm, escpos.CP858))

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("expected the job result to be reported")
	}

	mu.Lock()
	status := reported["status"]
	mu.Unlock()
	if status != "printed" {
		t.Errorf("expected status printed, got %q", status)
	}

	jobs := printer.jobs()
	if len(jobs) != 1 {
		t.Fatalf("expected exactly one ticket, got %d", len(jobs))
	}
	if !bytes.Contains(jobs[0], []byte("Establishment Central")) {
		t.Errorf("expected the rendered ticket to reach the printer, got %q", jobs[0])
	}
}

func TestRun_ReportsAFailedPrint(t *testing.T) {
	var (
		mu       sync.Mutex
		served   bool
		reported map[string]string
	)

	done := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/printer/jobs/next":
			mu.Lock()
			defer mu.Unlock()
			if served {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			served = true
			json.NewEncoder(w).Encode(Job{ID: "job-2", Payload: escpos.TicketPayload{Type: "order"}})

		case "/printer/jobs/job-2/result":
			mu.Lock()
			json.NewDecoder(r.Body).Decode(&reported)
			mu.Unlock()
			close(done)
		}
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go Run(ctx, testConfig(server.URL),
		usecase.NewPrintTicketUseCase(&recordingPrinter{fail: errors.New("printer is off")}),
		escpos.NewRenderer(escpos.Width58mm, escpos.CP858))

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("expected the failure to be reported")
	}

	mu.Lock()
	defer mu.Unlock()
	if reported["status"] != "failed" {
		t.Errorf("expected status failed, got %q", reported["status"])
	}
	if reported["error"] == "" {
		t.Error("expected the failure reason to be reported")
	}
}

func TestRun_StopsWhenTheContextIsCancelled(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})

	go func() {
		Run(ctx, testConfig(server.URL),
			usecase.NewPrintTicketUseCase(&recordingPrinter{}),
			escpos.NewRenderer(escpos.Width58mm, escpos.CP858))
		close(stopped)
	}()

	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-stopped:
	case <-time.After(2 * time.Second):
		t.Fatal("expected Run to return once the context is cancelled")
	}
}
