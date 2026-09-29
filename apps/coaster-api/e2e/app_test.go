package e2e

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"coaster-api/internal/service"
)

const (
	defaultUserID = "00000000-0000-4000-8000-000000000000"
	startTimeout  = 15 * time.Second
	stopTimeout   = 10 * time.Second
)

type app struct {
	url     string
	tokens  *service.AccessTokenService
	mailbox *mailbox
}

func newApp(t *testing.T) *app {
	t.Helper()

	mail := newMailbox(t)
	port := freePort(t)

	var logs lockedBuffer
	api := exec.Command(apiBinary)
	api.Env = []string{
		"NODE_ENV=test",
		"PORT=" + port,
		"DATABASE_URL=" + testDB.URL,
		"REDIS_URL=",
		"AUTH_JWT_SECRET=" + authSecret,
		"PRINTER_JWT_SECRET=" + printerSecret,
		"GOOGLE_CLIENT_ID=" + googleClientID,
		"GOOGLE_CERTS_URL=" + googleCert.URL,
		"PWNED_PASSWORDS_ENABLED=false",
		"PUBLIC_DIR=../public",
		"TEST_MAILBOX_URL=" + mail.url,
	}
	api.Stdout = &logs
	api.Stderr = &logs

	if err := api.Start(); err != nil {
		t.Fatalf("starting the API: %v", err)
	}

	exited := make(chan struct{})
	go func() {
		_ = api.Wait()
		close(exited)
	}()

	t.Cleanup(func() {
		stop(api, exited)
		if t.Failed() {
			t.Logf("API logs:\n%s", logs.String())
		}
	})

	a := &app{
		url:     "http://127.0.0.1:" + port,
		tokens:  service.NewAccessTokenService(authSecret, nil, nil),
		mailbox: mail,
	}
	a.waitUntilListening(t, exited, &logs)

	return a
}

func (a *app) waitUntilListening(t *testing.T, exited <-chan struct{}, logs *lockedBuffer) {
	t.Helper()

	deadline := time.Now().Add(startTimeout)
	for time.Now().Before(deadline) {
		select {
		case <-exited:
			t.Fatalf("the API exited before listening:\n%s", logs.String())
		default:
		}

		response, err := http.Get(a.url + "/api/v1/")
		if err == nil {
			response.Body.Close()
			return
		}
		time.Sleep(20 * time.Millisecond)
	}

	t.Fatalf("the API did not listen within %s:\n%s", startTimeout, logs.String())
}

func stop(api *exec.Cmd, exited <-chan struct{}) {
	_ = api.Process.Signal(syscall.SIGTERM)

	select {
	case <-exited:
	case <-time.After(stopTimeout):
		_ = api.Process.Kill()
		<-exited
	}
}

type option func(t *testing.T, a *app, request *http.Request)

func as(userID string) option {
	return func(t *testing.T, a *app, request *http.Request) {
		request.Header.Set("Authorization", "Bearer "+a.token(t, userID))
	}
}

func anonymous() option {
	return func(_ *testing.T, _ *app, request *http.Request) {
		request.Header.Del("Authorization")
	}
}

func withHeader(key, value string) option {
	return func(_ *testing.T, _ *app, request *http.Request) {
		request.Header.Set(key, value)
	}
}

func (a *app) token(t *testing.T, userID string) string {
	t.Helper()

	token, err := a.tokens.Sign(userID, "e2e-session-"+userID)
	if err != nil {
		t.Fatalf("signing a token: %v", err)
	}
	return token
}

func (a *app) get(t *testing.T, path string, options ...option) *response {
	t.Helper()
	return a.do(t, http.MethodGet, path, nil, options...)
}

func (a *app) post(t *testing.T, path string, body any, options ...option) *response {
	t.Helper()
	return a.do(t, http.MethodPost, path, body, options...)
}

func (a *app) patch(t *testing.T, path string, body any, options ...option) *response {
	t.Helper()
	return a.do(t, http.MethodPatch, path, body, options...)
}

func (a *app) put(t *testing.T, path string, body any, options ...option) *response {
	t.Helper()
	return a.do(t, http.MethodPut, path, body, options...)
}

func (a *app) delete(t *testing.T, path string, options ...option) *response {
	t.Helper()
	return a.do(t, http.MethodDelete, path, nil, options...)
}

func (a *app) do(t *testing.T, method, path string, body any, options ...option) *response {
	t.Helper()

	request, err := http.NewRequest(method, a.url+"/api/v1"+path, requestBody(t, body))
	if err != nil {
		t.Fatalf("building %s %s: %v", method, path, err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	request.Header.Set("Authorization", "Bearer "+a.token(t, defaultUserID))

	for _, apply := range options {
		apply(t, a, request)
	}

	answer, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer answer.Body.Close()

	content, err := io.ReadAll(answer.Body)
	if err != nil {
		t.Fatalf("reading %s %s: %v", method, path, err)
	}

	return &response{method: method, path: path, status: answer.StatusCode, header: answer.Header, body: content}
}

func requestBody(t *testing.T, body any) io.Reader {
	t.Helper()

	switch value := body.(type) {
	case nil:
		return nil
	case string:
		return strings.NewReader(value)
	default:
		content, err := json.Marshal(value)
		if err != nil {
			t.Fatalf("encoding the body: %v", err)
		}
		return bytes.NewReader(content)
	}
}

type response struct {
	method string
	path   string
	status int
	header http.Header
	body   []byte
}

func (r *response) expect(t *testing.T, status int) *response {
	t.Helper()

	if r.status != status {
		t.Fatalf("%s %s = %d, want %d: %s", r.method, r.path, r.status, status, r.body)
	}
	return r
}

func (r *response) decode(t *testing.T, value any) {
	t.Helper()

	if err := json.Unmarshal(r.body, value); err != nil {
		t.Fatalf("%s %s: decoding %s: %v", r.method, r.path, r.body, err)
	}
}

func (r *response) object(t *testing.T) map[string]any {
	t.Helper()

	var object map[string]any
	r.decode(t, &object)
	return object
}

func (r *response) list(t *testing.T) []map[string]any {
	t.Helper()

	var list []map[string]any
	r.decode(t, &list)
	return list
}

func freePort(t *testing.T) string {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("finding a free port: %v", err)
	}
	defer listener.Close()

	return strconv.Itoa(listener.Addr().(*net.TCPAddr).Port)
}

type lockedBuffer struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.Write(p)
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.String()
}
