package httpapi

import (
	"bufio"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

type memberAccess struct{ fakeAccess }

func (memberAccess) Membership(_ context.Context, _ string, establishmentID string) (*domain.Membership, error) {
	if establishmentID != "establishment-1" {
		return nil, nil
	}
	return &domain.Membership{Role: "STAFF", Active: true}, nil
}

type replayBus struct {
	frames []domain.RealtimeFrame
	asked  string
}

func (b *replayBus) PublishEvent(string, domain.RealtimeFrame) {}
func (b *replayBus) PublishRevoke(string, string)              {}
func (b *replayBus) Remember(string, domain.RealtimeFrame)     {}
func (b *replayBus) Replay(_ context.Context, establishmentID string, sinceID string) []domain.RealtimeFrame {
	b.asked = establishmentID + "/" + sinceID
	return b.frames
}

func newRealtimeServer(t *testing.T, bus *replayBus) (*httptest.Server, *service.RealtimeService) {
	t.Helper()

	realtime := service.NewRealtimeService(bus)
	guard := middleware.NewGuard(fakeTokens{}, memberAccess{}, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewRealtimeHandler(realtime).RegisterRoutes(mux, guard)

	handler, err := withGlobalMiddlewares(RouterConfig{}, mux)
	if err != nil {
		t.Fatalf("building the router: %v", err)
	}

	server := httptest.NewServer(handler)
	t.Cleanup(func() {
		realtime.CloseAll()
		server.Close()
	})
	return server, realtime
}

func openStream(t *testing.T, server *httptest.Server, establishmentID string, headers map[string]string) *http.Response {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	request, _ := http.NewRequestWithContext(ctx, "GET", server.URL+"/api/v1/establishments/"+establishmentID+"/events", nil)
	request.Header.Set("Authorization", "Bearer good")
	request.Header.Set("Accept", "text/event-stream")
	request.Header.Set("Accept-Encoding", "gzip")
	for key, value := range headers {
		request.Header.Set(key, value)
	}

	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatalf("opening the stream: %v", err)
	}
	t.Cleanup(func() { response.Body.Close() })
	return response
}

func readUntil(t *testing.T, response *http.Response, want string) string {
	t.Helper()

	lines := make(chan string)
	stop := make(chan struct{})
	defer close(stop)
	go func() {
		defer close(lines)
		reader := bufio.NewReader(response.Body)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			select {
			case lines <- line:
			case <-stop:
				return
			}
		}
	}()

	var seen strings.Builder
	timeout := time.After(5 * time.Second)
	for !strings.Contains(seen.String(), want) {
		select {
		case line, ok := <-lines:
			if !ok {
				t.Fatalf("the stream ended without %q; read %q", want, seen.String())
			}
			seen.WriteString(line)
		case <-timeout:
			t.Fatalf("timed out waiting for %q; read %q", want, seen.String())
		}
	}
	return seen.String()
}

func waitForWatchers(t *testing.T, realtime *service.RealtimeService, establishmentID string, count int) {
	t.Helper()
	waitFor(t, "the stream to be registered", func() bool { return realtime.CountFor(establishmentID) == count })
}

func TestRealtimeHandlerRefusesAnOutsider(t *testing.T) {
	server, _ := newRealtimeServer(t, &replayBus{})

	response := openStream(t, server, "establishment-2", nil)
	body, _ := io.ReadAll(response.Body)

	want := `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`
	if response.StatusCode != http.StatusForbidden || string(body) != want {
		t.Fatalf("status %d, body %s", response.StatusCode, body)
	}
}

func TestRealtimeHandlerOpensTheStream(t *testing.T) {
	server, _ := newRealtimeServer(t, &replayBus{})

	response := openStream(t, server, "establishment-1", nil)

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status %d", response.StatusCode)
	}
	wantHeaders := map[string]string{
		"Content-Type":      "text/event-stream",
		"Cache-Control":     "no-cache, no-transform",
		"X-Accel-Buffering": "no",
		"Content-Encoding":  "",
	}
	for name, want := range wantHeaders {
		if got := response.Header.Get(name); got != want {
			t.Errorf("%s = %q, want %q", name, got, want)
		}
	}

	readUntil(t, response, ": open\n")
}

func TestRealtimeHandlerDeliversEvents(t *testing.T) {
	server, realtime := newRealtimeServer(t, &replayBus{})
	response := openStream(t, server, "establishment-1", nil)
	waitForWatchers(t, realtime, "establishment-1", 1)

	realtime.Publish("establishment-2", domain.RealtimeOrderUpdated, map[string]string{"id": "order-0"})
	realtime.Publish("establishment-1", domain.RealtimeOrderDeleted, map[string]string{"id": "order-1"})
	realtime.Publish("establishment-1", domain.RealtimeOrderCreated, map[string]string{"id": "order-2"})

	seen := readUntil(t, response, "event: orderCreated\ndata: {\"id\":\"order-2\"}\n")

	if !strings.Contains(seen, "event: orderDeleted\ndata: {\"id\":\"order-1\"}\n\n") {
		t.Fatalf("read %q", seen)
	}
	if strings.Contains(seen, "orderUpdated") {
		t.Fatalf("an event of another establishment leaked: %q", seen)
	}
}

func TestRealtimeHandlerClosesARevokedStream(t *testing.T) {
	server, realtime := newRealtimeServer(t, &replayBus{})
	response := openStream(t, server, "establishment-1", nil)
	waitForWatchers(t, realtime, "establishment-1", 1)

	realtime.Revoke("establishment-1", testUser.ID)

	finished := make(chan error)
	go func() {
		_, err := io.ReadAll(response.Body)
		finished <- err
	}()
	select {
	case err := <-finished:
		if err != nil {
			t.Fatalf("the stream broke instead of ending: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the stream is still open")
	}
	waitForWatchers(t, realtime, "establishment-1", 0)
}

func TestRealtimeHandlerReplaysWhatWasMissed(t *testing.T) {
	bus := &replayBus{frames: []domain.RealtimeFrame{
		{ID: "1200", Event: domain.RealtimeOrderUpdated, Payload: []byte(`{"id":"order-2"}`)},
	}}
	server, _ := newRealtimeServer(t, bus)

	response := openStream(t, server, "establishment-1", map[string]string{"Last-Event-ID": "1000"})

	readUntil(t, response, "id: 1200\nevent: orderUpdated\ndata: {\"id\":\"order-2\"}\n")
	if bus.asked != "establishment-1/1000" {
		t.Fatalf("asked the bus for %q", bus.asked)
	}
}

func TestRealtimeHandlerClosesEveryStreamOnShutdown(t *testing.T) {
	server, realtime := newRealtimeServer(t, &replayBus{})
	response := openStream(t, server, "establishment-1", nil)
	waitForWatchers(t, realtime, "establishment-1", 1)

	realtime.CloseAll()

	if _, err := io.ReadAll(response.Body); err != nil {
		t.Fatalf("the stream broke instead of ending: %v", err)
	}
}
