package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

var testUser = domain.User{ID: "u1", Email: "ana@example.com", Name: "Ana", Active: true, Role: domain.RoleUser, Language: "es"}

type fakeTokens struct{}

func (fakeTokens) Resolve(_ context.Context, authorization string) (*domain.Caller, error) {
	if authorization != "Bearer good" {
		return nil, nil
	}
	user := testUser
	return &domain.Caller{Claims: domain.SessionClaims{Sub: user.ID, Sid: "s1"}, User: &user}, nil
}

type fakeAccess struct{}

func (fakeAccess) UserRole(context.Context, string) (domain.Role, error) { return domain.RoleUser, nil }
func (fakeAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	return nil, nil
}
func (fakeAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return nil, nil
}
func (fakeAccess) SubscriptionActive(context.Context, string) (bool, error) { return true, nil }

type countingLimiter struct{ hits map[string]int }

func (l *countingLimiter) Hit(_ context.Context, key string, ttl time.Duration, limit int, _ time.Duration) ports.RateLimit {
	l.hits[key]++
	return ports.RateLimit{TotalHits: l.hits[key], TimeToExpire: int(ttl.Seconds()), Blocked: l.hits[key] > limit, TimeToBlockExpire: int(ttl.Seconds())}
}

type fakeAuth struct {
	ports.AuthService
	issued       domain.IssuedSession
	err          error
	gotEmail     string
	gotToken     string
	gotOrigin    domain.SessionOrigin
	gotLanguage  *string
	loggedOutAll string
}

func (f *fakeAuth) Register(_ context.Context, input domain.RegisterInput, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	f.gotEmail, f.gotLanguage, f.gotOrigin = input.Email, input.Language, origin
	return f.issued, f.err
}

func (f *fakeAuth) LoginWithPassword(_ context.Context, email, _ string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	f.gotEmail, f.gotOrigin = email, origin
	return f.issued, f.err
}

func (f *fakeAuth) Refresh(_ context.Context, token string, _ domain.SessionOrigin) (domain.IssuedSession, error) {
	f.gotToken = token
	return f.issued, f.err
}

func (f *fakeAuth) Logout(_ context.Context, token string, _ domain.SessionOrigin) error {
	f.gotToken = token
	return f.err
}

func (f *fakeAuth) LogoutEverywhere(_ context.Context, userID string, _ domain.SessionOrigin) error {
	f.loggedOutAll = userID
	return f.err
}

func (f *fakeAuth) PasswordReset(_ context.Context, token string) (domain.PasswordResetSummary, error) {
	f.gotToken = token
	return domain.PasswordResetSummary{Email: "ana@example.com"}, f.err
}

func newAuthServer(auth *fakeAuth, account ports.AccountService) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, fakeAccess{}, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewAuthHandler(auth, true).RegisterRoutes(mux, guard)
	NewAccountHandler(account).RegisterRoutes(mux, guard)
	return mux
}

func send(server http.Handler, method, target, body string, headers map[string]string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	return response
}

func TestAuthHandlerSignsIn(t *testing.T) {
	expires := time.Date(2026, 10, 27, 10, 0, 0, 0, time.UTC)
	auth := &fakeAuth{issued: domain.IssuedSession{User: testUser, AccessToken: "access", RefreshToken: "refresh", RefreshExpiresAt: expires}}
	server := newAuthServer(auth, nil)

	response := send(server, "POST", "/api/v1/auth/register",
		`{"email":"ana@example.com","password":"a long password","name":"Ana","language":"en"}`,
		map[string]string{"User-Agent": "Firefox", "X-Forwarded-For": "203.0.113.9"})

	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d (%s)", response.Code, response.Body)
	}
	wantBody := `{"user":{"id":"u1","email":"ana@example.com","name":"Ana","active":true,"role":"USER","language":"es","emailVerified":false},"accessToken":"access","expiresIn":900}`
	if response.Body.String() != wantBody {
		t.Fatalf("body = %s", response.Body)
	}
	wantCookie := "coaster_session=refresh; Path=/api/v1/auth; Expires=Tue, 27 Oct 2026 10:00:00 GMT; HttpOnly; Secure; SameSite=Lax"
	if got := response.Header().Get("Set-Cookie"); got != wantCookie {
		t.Fatalf("cookie = %s", got)
	}
	if response.Header().Get("X-RateLimit-Limit") != "10" {
		t.Fatalf("register must be limited to 10 per minute, headers %v", response.Header())
	}
	if auth.gotLanguage == nil || *auth.gotLanguage != "en" || auth.gotOrigin != (domain.SessionOrigin{UserAgent: "Firefox", IP: "203.0.113.9"}) {
		t.Fatalf("service got language %v, origin %+v", auth.gotLanguage, auth.gotOrigin)
	}

	response = send(server, "POST", "/api/v1/auth/login", `{"email":"ana@example.com","password":"x"}`, nil)
	if response.Code != http.StatusOK || auth.gotEmail != "ana@example.com" {
		t.Fatalf("login = %d (%s)", response.Code, response.Body)
	}
}

func TestAuthHandlerErrors(t *testing.T) {
	auth := &fakeAuth{err: domain.Unauthorized(domain.CodeInvalidCredentials)}
	server := newAuthServer(auth, nil)

	tests := []struct {
		name     string
		method   string
		target   string
		body     string
		headers  map[string]string
		wantCode int
		wantBody string
	}{
		{name: "bad email", method: "POST", target: "/api/v1/auth/login", body: `{"email":"nope","password":"x"}`, wantCode: 400,
			wantBody: `{"message":["email must be an email"],"error":"Bad Request","statusCode":400}`},
		{name: "unknown property", method: "POST", target: "/api/v1/auth/forgot-password", body: `{"email":"a@b.com","extra":1}`, wantCode: 400,
			wantBody: `{"message":["property extra should not exist"],"error":"Bad Request","statusCode":400}`},
		{name: "short password", method: "POST", target: "/api/v1/auth/register", body: `{"email":"a@b.com","password":"short","name":"A"}`, wantCode: 400,
			wantBody: `{"message":["password must be longer than or equal to 8 characters"],"error":"Bad Request","statusCode":400}`},
		{name: "wrong password", method: "POST", target: "/api/v1/auth/login", body: `{"email":"a@b.com","password":"x"}`, wantCode: 401,
			wantBody: `{"message":"INVALID_CREDENTIALS","error":"Unauthorized","statusCode":401}`},
		{name: "logout everywhere without a token", method: "POST", target: "/api/v1/auth/logout-everywhere", wantCode: 401},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := send(server, tt.method, tt.target, tt.body, tt.headers)
			if response.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d (%s)", response.Code, tt.wantCode, response.Body)
			}
			if tt.wantBody != "" && response.Body.String() != tt.wantBody {
				t.Fatalf("body = %s, want %s", response.Body, tt.wantBody)
			}
		})
	}
}

func TestAuthHandlerCookie(t *testing.T) {
	auth := &fakeAuth{issued: domain.IssuedSession{User: testUser, RefreshToken: "next", RefreshExpiresAt: time.Now().Add(time.Hour)}}
	server := newAuthServer(auth, nil)

	response := send(server, "POST", "/api/v1/auth/refresh", "", map[string]string{"Cookie": "coaster_session=old"})
	if response.Code != http.StatusOK || auth.gotToken != "old" || !strings.HasPrefix(response.Header().Get("Set-Cookie"), "coaster_session=next;") {
		t.Fatalf("refresh = %d, token %q, cookie %s", response.Code, auth.gotToken, response.Header().Get("Set-Cookie"))
	}
	if response.Header().Get("X-RateLimit-Limit") != "60" {
		t.Fatalf("refresh must be limited to 60 per minute")
	}

	response = send(server, "POST", "/api/v1/auth/logout", "", map[string]string{"Cookie": "coaster_session=old"})
	wantCleared := "coaster_session=; Path=/api/v1/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
	if response.Code != http.StatusNoContent || response.Header().Get("Set-Cookie") != wantCleared {
		t.Fatalf("logout = %d, cookie %s", response.Code, response.Header().Get("Set-Cookie"))
	}
	if response.Header().Get("X-RateLimit-Limit") != "300" {
		t.Fatalf("logout keeps the global limit")
	}

	response = send(server, "POST", "/api/v1/auth/logout-everywhere", "", map[string]string{"Authorization": "Bearer good"})
	if response.Code != http.StatusNoContent || auth.loggedOutAll != "u1" || response.Header().Get("Set-Cookie") != wantCleared {
		t.Fatalf("logout everywhere = %d, user %q", response.Code, auth.loggedOutAll)
	}

	response = send(server, "GET", "/api/v1/auth/reset-password/abc", "", nil)
	if response.Code != http.StatusOK || response.Body.String() != `{"email":"ana@example.com"}` || auth.gotToken != "abc" {
		t.Fatalf("reset-password summary = %d %s", response.Code, response.Body)
	}
}

func TestAuthHandlerThrottlesLogin(t *testing.T) {
	auth := &fakeAuth{err: domain.Unauthorized(domain.CodeInvalidCredentials)}
	server := newAuthServer(auth, nil)

	for range 10 {
		send(server, "POST", "/api/v1/auth/login", `{"email":"a@b.com","password":"x"}`, nil)
	}

	response := send(server, "POST", "/api/v1/auth/login", `{"email":"a@b.com","password":"x"}`, nil)
	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") != "60" {
		t.Fatalf("eleventh login = %d %v", response.Code, response.Header())
	}
}
