package http

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

const allowedOrigin = "http://localhost:4200"

func testServer(t *testing.T) http.Handler {
	t.Helper()

	publicDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(publicDir, "downloads"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(publicDir, "downloads", "bridge.txt"), []byte("bridge"), 0o644); err != nil {
		t.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /public/", staticFiles(publicDir))

	mux.HandleFunc("GET "+apiPrefix+"/things/{id}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"id": r.PathValue("id")})
	})
	mux.HandleFunc("GET "+apiPrefix+"/missing", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, domain.NotFound(domain.CodeEstablishmentNotFound))
	})
	mux.HandleFunc("GET "+apiPrefix+"/limited", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, domain.TooManyRequests(domain.CodeTooManyAttempts))
	})
	mux.HandleFunc("GET "+apiPrefix+"/expired", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, domain.PaymentRequired(domain.CodeSubscriptionExpired))
	})
	mux.HandleFunc("GET "+apiPrefix+"/broken", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, io.ErrUnexpectedEOF)
	})
	mux.HandleFunc("GET "+apiPrefix+"/panic", func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})
	mux.HandleFunc("GET "+apiPrefix+"/big", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"text": strings.Repeat("a", 2000)})
	})
	mux.HandleFunc("GET "+apiPrefix+"/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Write([]byte(strings.Repeat("data: a\n\n", 200)))
	})
	mux.HandleFunc("POST "+apiPrefix+"/users", func(w http.ResponseWriter, r *http.Request) {
		var input testUserRequest
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, input)
	})

	handler, err := withGlobalMiddlewares(RouterConfig{CORSOrigins: []string{allowedOrigin}}, withNestNotFound(mux))
	if err != nil {
		t.Fatal(err)
	}

	return handler
}

type testUserRequest struct {
	Email string `json:"email" validate:"required,email"`
	Name  string `json:"name" validate:"required,max=10"`
}

func serve(t *testing.T, handler http.Handler, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestNestResponses(t *testing.T) {
	handler := testServer(t)

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{
			name: "route that does not exist", method: "GET", path: "/api/v1/nope",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /api/v1/nope","error":"Not Found","statusCode":404}`,
		},
		{
			name: "route that does not exist keeps the query", method: "GET", path: "/api/v1/nope?a=1",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /api/v1/nope?a=1","error":"Not Found","statusCode":404}`,
		},
		{
			name: "wrong method is a 404, not a 405", method: "DELETE", path: "/api/v1/things/1",
			wantStatus: 404, wantBody: `{"message":"Cannot DELETE /api/v1/things/1","error":"Not Found","statusCode":404}`,
		},
		{
			name: "trailing slash is another route", method: "GET", path: "/api/v1/things/1/",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /api/v1/things/1/","error":"Not Found","statusCode":404}`,
		},
		{
			name: "double slash is not redirected", method: "GET", path: "/api/v1//things/1",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /api/v1//things/1","error":"Not Found","statusCode":404}`,
		},
		{
			name: "route with a parameter", method: "GET", path: "/api/v1/things/42",
			wantStatus: 200, wantBody: `{"id":"42"}`,
		},
		{
			name: "domain error", method: "GET", path: "/api/v1/missing",
			wantStatus: 404, wantBody: `{"message":"ESTABLISHMENT_NOT_FOUND","error":"Not Found","statusCode":404}`,
		},
		{
			name: "HttpException with a string has no error field", method: "GET", path: "/api/v1/limited",
			wantStatus: 429, wantBody: `{"statusCode":429,"message":"TOO_MANY_ATTEMPTS"}`,
		},
		{
			name: "subscription guard's 402", method: "GET", path: "/api/v1/expired",
			wantStatus: 402, wantBody: `{"statusCode":402,"error":"Payment Required","message":"SUBSCRIPTION_EXPIRED","errorCode":"SUBSCRIPTION_EXPIRED"}`,
		},
		{
			name: "unexpected error", method: "GET", path: "/api/v1/broken",
			wantStatus: 500, wantBody: `{"statusCode":500,"message":"Internal server error"}`,
		},
		{
			name: "panic", method: "GET", path: "/api/v1/panic",
			wantStatus: 500, wantBody: `{"statusCode":500,"message":"Internal server error"}`,
		},
		{
			name: "broken JSON", method: "POST", path: "/api/v1/users", body: `{"email":`,
			wantStatus: 400, wantBody: `{"statusCode":400,"message":"Body is not valid JSON but content-type is set to 'application/json'"}`,
		},
		{
			name: "empty JSON body", method: "POST", path: "/api/v1/users", body: ``,
			wantStatus: 400, wantBody: `{"statusCode":400,"message":"Body cannot be empty when content-type is set to 'application/json'"}`,
		},
		{
			name: "validation, unknown properties first", method: "POST", path: "/api/v1/users", body: `{"foo":1,"email":"nope","name":"Ana"}`,
			wantStatus: 400, wantBody: `{"message":["property foo should not exist","email must be an email"],"error":"Bad Request","statusCode":400}`,
		},
		{
			name: "valid body", method: "POST", path: "/api/v1/users", body: `{"email":"ana@example.com","name":"<Ana>"}`,
			wantStatus: 201, wantBody: `{"email":"ana@example.com","name":"<Ana>"}`,
		},
		{
			name: "public file", method: "GET", path: "/public/downloads/bridge.txt",
			wantStatus: 200, wantBody: `bridge`,
		},
		{
			name: "public folder has no listing", method: "GET", path: "/public/downloads/",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /public/downloads/","error":"Not Found","statusCode":404}`,
		},
		{
			name: "public file that does not exist", method: "GET", path: "/public/downloads/nope.txt",
			wantStatus: 404, wantBody: `{"message":"Cannot GET /public/downloads/nope.txt","error":"Not Found","statusCode":404}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.method == "POST" {
				req.Header.Set("Content-Type", "application/json")
			}

			rec := serve(t, handler, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if got := rec.Body.String(); got != tt.wantBody {
				t.Errorf("body = %s\nwant   %s", got, tt.wantBody)
			}
		})
	}
}

func TestJSONContentType(t *testing.T) {
	rec := serve(t, testServer(t), httptest.NewRequest("GET", "/api/v1/nope", nil))

	if got := rec.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %q", got)
	}
}

func TestSecurityHeadersOnEveryResponse(t *testing.T) {
	handler := testServer(t)

	preflight := httptest.NewRequest("OPTIONS", "/api/v1/things/1", nil)
	preflight.Header.Set("Origin", allowedOrigin)
	preflight.Header.Set("Access-Control-Request-Method", "GET")

	requests := map[string]*http.Request{
		"success":   httptest.NewRequest("GET", "/api/v1/things/1", nil),
		"not found": httptest.NewRequest("GET", "/api/v1/nope", nil),
		"panic":     httptest.NewRequest("GET", "/api/v1/panic", nil),
		"preflight": preflight,
	}

	for name, req := range requests {
		t.Run(name, func(t *testing.T) {
			rec := serve(t, handler, req)

			for header, want := range securityHeadersForTest {
				if got := rec.Header().Get(header); got != want {
					t.Errorf("%s = %q, want %q", header, got, want)
				}
			}
		})
	}
}

var securityHeadersForTest = map[string]string{
	"Content-Security-Policy":           "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
	"Cross-Origin-Opener-Policy":        "same-origin",
	"Cross-Origin-Resource-Policy":      "same-origin",
	"Origin-Agent-Cluster":              "?1",
	"Referrer-Policy":                   "no-referrer",
	"Strict-Transport-Security":         "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options":            "nosniff",
	"X-DNS-Prefetch-Control":            "off",
	"X-Download-Options":                "noopen",
	"X-Frame-Options":                   "SAMEORIGIN",
	"X-Permitted-Cross-Domain-Policies": "none",
	"X-XSS-Protection":                  "0",
}

func TestCORS(t *testing.T) {
	handler := testServer(t)

	tests := []struct {
		name          string
		method        string
		origin        string
		requestMethod string
		wantStatus    int
		wantOrigin    string
		wantMethods   string
		wantBody      string
	}{
		{name: "allowed origin", method: "GET", origin: allowedOrigin, wantStatus: 200, wantOrigin: allowedOrigin},
		{name: "other origin", method: "GET", origin: "https://evil.example", wantStatus: 200},
		{name: "no origin", method: "GET", wantStatus: 200},
		{
			name: "preflight from an allowed origin", method: "OPTIONS", origin: allowedOrigin, requestMethod: "POST",
			wantStatus: 204, wantOrigin: allowedOrigin, wantMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		},
		{
			name: "preflight from another origin", method: "OPTIONS", origin: "https://evil.example", requestMethod: "POST",
			wantStatus: 204, wantMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		},
		{
			name: "OPTIONS that is not a preflight", method: "OPTIONS", origin: allowedOrigin,
			wantStatus: 400, wantOrigin: allowedOrigin, wantBody: "Invalid Preflight Request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/v1/things/1", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if tt.requestMethod != "" {
				req.Header.Set("Access-Control-Request-Method", tt.requestMethod)
			}

			rec := serve(t, handler, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if got := rec.Header().Get("Vary"); got != "Origin" {
				t.Errorf("Vary = %q, want Origin", got)
			}
			if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
				t.Errorf("Access-Control-Allow-Credentials = %q, want true", got)
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != tt.wantOrigin {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, tt.wantOrigin)
			}
			if got := rec.Header().Get("Access-Control-Allow-Methods"); got != tt.wantMethods {
				t.Errorf("Access-Control-Allow-Methods = %q, want %q", got, tt.wantMethods)
			}
			if tt.wantMethods != "" {
				if got := rec.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type, Authorization, Last-Event-ID" {
					t.Errorf("Access-Control-Allow-Headers = %q", got)
				}
			}
			if tt.wantBody != "" && rec.Body.String() != tt.wantBody {
				t.Errorf("body = %q, want %q", rec.Body.String(), tt.wantBody)
			}
		})
	}
}

func TestCompression(t *testing.T) {
	handler := testServer(t)

	tests := []struct {
		name     string
		path     string
		wantGzip bool
	}{
		{name: "large JSON is compressed", path: "/api/v1/big", wantGzip: true},
		{name: "small JSON is not", path: "/api/v1/things/1", wantGzip: false},
		{name: "event streams never are", path: "/api/v1/events", wantGzip: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			req.Header.Set("Accept-Encoding", "gzip, deflate")

			rec := serve(t, handler, req)

			gotGzip := rec.Header().Get("Content-Encoding") == "gzip"
			if gotGzip != tt.wantGzip {
				t.Fatalf("gzip = %v, want %v", gotGzip, tt.wantGzip)
			}

			if gotGzip {
				reader, err := gzip.NewReader(rec.Body)
				if err != nil {
					t.Fatal(err)
				}
				body, err := io.ReadAll(reader)
				if err != nil {
					t.Fatal(err)
				}
				if !strings.HasPrefix(string(body), `{"text":"aaa`) {
					t.Errorf("unexpected body %.30s", body)
				}
			}
		})
	}
}
