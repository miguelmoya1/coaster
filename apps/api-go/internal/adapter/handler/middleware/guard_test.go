package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
	"api-go/internal/service"
)

type fakeTokens struct {
	users map[string]*domain.User
}

func (f fakeTokens) Resolve(_ context.Context, authorization string) (*service.Caller, error) {
	id := strings.TrimPrefix(authorization, "Bearer ")
	user, ok := f.users[id]
	if !ok {
		return nil, nil
	}
	return &service.Caller{Claims: domain.SessionClaims{Sub: id, Sid: "session-" + id}, User: user}, nil
}

type fakeAccess struct {
	roles        map[string]domain.Role
	memberships  map[string]*domain.Membership
	modules      []domain.EstablishmentModule
	subscription bool
}

func (f fakeAccess) UserRole(_ context.Context, userID string) (domain.Role, error) {
	return f.roles[userID], nil
}

func (f fakeAccess) Membership(_ context.Context, userID, establishmentID string) (*domain.Membership, error) {
	if establishmentID != "e1" {
		return nil, nil
	}
	return f.memberships[userID], nil
}

func (f fakeAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return f.modules, nil
}

func (f fakeAccess) SubscriptionActive(context.Context, string) (bool, error) {
	return f.subscription, nil
}

type fakeLimiter struct {
	hits    map[string]int
	lastKey string
}

func (f *fakeLimiter) Hit(_ context.Context, key string, ttl time.Duration, limit int, block time.Duration) ports.RateLimit {
	f.hits[key]++
	f.lastKey = key
	hits := f.hits[key]
	return ports.RateLimit{TotalHits: hits, TimeToExpire: int(ttl.Seconds()), Blocked: hits > limit, TimeToBlockExpire: int(block.Seconds())}
}

func newTestGuard(access fakeAccess) (*Guard, *fakeLimiter) {
	tokens := fakeTokens{users: map[string]*domain.User{
		"ana":      {ID: "ana", Active: true, Role: domain.RoleUser},
		"admin":    {ID: "admin", Active: true, Role: domain.RoleAdmin},
		"inactive": {ID: "inactive", Active: false, Role: domain.RoleUser},
	}}
	if access.roles == nil {
		access.roles = map[string]domain.Role{"ana": domain.RoleUser, "admin": domain.RoleAdmin}
	}
	limiter := &fakeLimiter{hits: map[string]int{}}
	return NewGuard(tokens, access, limiter, 1), limiter
}

type seen struct {
	called      bool
	user        *domain.User
	session     *domain.SessionClaims
	permissions []domain.EstablishmentPermission
	ip          string
}

func serve(guard *Guard, method, pattern, target, token string, rules ...Rule) (*httptest.ResponseRecorder, *seen) {
	got := &seen{}
	mux := http.NewServeMux()
	mux.Handle(method+" "+pattern, guard.Protect(method+" "+pattern, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got.called = true
		got.user = CurrentUser(r.Context())
		got.session = CurrentSession(r.Context())
		got.permissions = EstablishmentPermissionsOf(r.Context())
		got.ip = ClientIP(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}), rules...))

	request := httptest.NewRequest(method, target, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, request)
	return response, got
}

func TestGuardRules(t *testing.T) {
	member := &domain.Membership{Role: string(domain.EstablishmentRoleStaff), Active: true}
	access := fakeAccess{
		memberships: map[string]*domain.Membership{
			"ana": member,
		},
		modules:      []domain.EstablishmentModule{domain.ModuleOrders},
		subscription: true,
	}

	tests := []struct {
		name     string
		access   *fakeAccess
		method   string
		pattern  string
		target   string
		token    string
		rules    []Rule
		wantCode int
		wantBody string
	}{
		{name: "no rules", pattern: "/x", target: "/x", wantCode: 204},
		{name: "auth without token", pattern: "/x", target: "/x", rules: []Rule{RequireAuth()}, wantCode: 401,
			wantBody: `{"message":"INVALID_CREDENTIALS","error":"Unauthorized","statusCode":401}`},
		{name: "auth with an inactive user", pattern: "/x", target: "/x", token: "inactive", rules: []Rule{RequireAuth()}, wantCode: 401},
		{name: "auth with a good token", pattern: "/x", target: "/x", token: "ana", rules: []Rule{RequireAuth()}, wantCode: 204},
		{name: "optional auth without token", pattern: "/x", target: "/x", rules: []Rule{OptionalAuth()}, wantCode: 204},
		{name: "admin as a user", pattern: "/x", target: "/x", token: "ana", rules: []Rule{Admin()}, wantCode: 403,
			wantBody: `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`},
		{name: "admin as an admin", pattern: "/x", target: "/x", token: "admin", rules: []Rule{Admin()}, wantCode: 204},
		{name: "member with the permission", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana",
			rules: []Rule{Permissions(domain.PermissionViewOrders)}, wantCode: 204},
		{name: "member without the permission", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana",
			rules: []Rule{Permissions(domain.PermissionRemoveMember)}, wantCode: 403,
			wantBody: `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`},
		{name: "not a member", pattern: "/e/{establishmentId}", target: "/e/e2", token: "ana", rules: []Rule{Permissions()}, wantCode: 403,
			wantBody: `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{name: "inactive member", access: &fakeAccess{memberships: map[string]*domain.Membership{"ana": {Role: "OWNER"}}, subscription: true},
			pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana", rules: []Rule{Permissions()}, wantCode: 403,
			wantBody: `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{name: "admin is not a member", pattern: "/e/{establishmentId}", target: "/e/e2", token: "admin",
			rules: []Rule{Permissions(domain.PermissionRemoveMember)}, wantCode: 204},
		{name: "permissions without an establishment", pattern: "/x", target: "/x", token: "ana",
			rules: []Rule{Permissions(domain.PermissionViewOrders)}, wantCode: 403,
			wantBody: `{"message":"MISSING_ESTABLISHMENT_ID","error":"Forbidden","statusCode":403}`},
		{name: "membership without an establishment", pattern: "/x", target: "/x", token: "ana", rules: []Rule{Permissions()}, wantCode: 204},
		{name: "module on", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana",
			rules: []Rule{Permissions(), Modules(domain.ModuleOrders)}, wantCode: 204},
		{name: "module off", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana",
			rules: []Rule{Permissions(), Modules(domain.ModuleOrders, domain.ModuleInventory)}, wantCode: 403,
			wantBody: `{"message":"MODULE_NOT_ENABLED","error":"Forbidden","statusCode":403}`},
		{name: "lapsed subscription on a write", access: &fakeAccess{memberships: access.memberships},
			method: "POST", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana", rules: []Rule{Permissions()}, wantCode: 402,
			wantBody: `{"statusCode":402,"error":"Payment Required","message":"SUBSCRIPTION_EXPIRED","errorCode":"SUBSCRIPTION_EXPIRED"}`},
		{name: "lapsed subscription before auth", access: &fakeAccess{}, method: "POST", pattern: "/e/{establishmentId}", target: "/e/e1",
			rules: []Rule{RequireAuth()}, wantCode: 402},
		{name: "lapsed subscription on a read", access: &fakeAccess{memberships: access.memberships},
			pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana", rules: []Rule{Permissions()}, wantCode: 204},
		{name: "lapsed subscription skipped", access: &fakeAccess{memberships: access.memberships},
			method: "POST", pattern: "/e/{establishmentId}", target: "/e/e1", token: "ana", rules: []Rule{Permissions(), SkipSubscriptionCheck()}, wantCode: 204},
		{name: "lapsed subscription while paying", access: &fakeAccess{memberships: access.memberships},
			method: "POST", pattern: "/establishments/{establishmentId}/establishment-subscription/checkout",
			target: "/establishments/e1/establishment-subscription/checkout", token: "ana", rules: []Rule{Permissions()}, wantCode: 204},
		{name: "lapsed subscription for an admin", access: &fakeAccess{},
			method: "DELETE", pattern: "/e/{establishmentId}", target: "/e/e1", token: "admin", rules: []Rule{Permissions()}, wantCode: 204},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			routeAccess := access
			if tt.access != nil {
				routeAccess = *tt.access
			}
			method := tt.method
			if method == "" {
				method = "GET"
			}
			guard, _ := newTestGuard(routeAccess)

			response, got := serve(guard, method, tt.pattern, tt.target, tt.token, tt.rules...)
			if response.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d (%s)", response.Code, tt.wantCode, response.Body)
			}
			if tt.wantBody != "" && response.Body.String() != tt.wantBody {
				t.Fatalf("body = %s, want %s", response.Body, tt.wantBody)
			}
			if got.called != (tt.wantCode == 204) {
				t.Fatalf("handler called = %v", got.called)
			}
		})
	}
}

func TestGuardFillsTheContext(t *testing.T) {
	access := fakeAccess{
		memberships:  map[string]*domain.Membership{"ana": {Role: string(domain.EstablishmentRoleManager), Active: true}},
		subscription: true,
	}
	guard, _ := newTestGuard(access)

	_, got := serve(guard, "GET", "/e/{establishmentId}", "/e/e1", "ana", Permissions())
	if got.user == nil || got.user.ID != "ana" || got.session == nil || got.session.Sid != "session-ana" {
		t.Fatalf("user = %+v, session = %+v", got.user, got.session)
	}
	if !slices.Equal(got.permissions, domain.RolePermissions(domain.EstablishmentRoleManager)) {
		t.Fatalf("permissions = %v", got.permissions)
	}
	if got.ip != "192.0.2.1" {
		t.Fatalf("ip = %q", got.ip)
	}

	_, got = serve(guard, "GET", "/e/{establishmentId}", "/e/e9", "admin", Permissions())
	if !slices.Equal(got.permissions, domain.AllEstablishmentPermissions) {
		t.Fatalf("an admin must have every permission, got %v", got.permissions)
	}

	_, got = serve(guard, "GET", "/x", "/x", "ana", OptionalAuth())
	if got.user == nil || got.session != nil {
		t.Fatalf("optional auth: user = %+v, session = %+v", got.user, got.session)
	}

	_, got = serve(guard, "GET", "/x", "/x", "inactive", OptionalAuth())
	if got.user != nil {
		t.Fatalf("optional auth must drop an inactive user")
	}
}

func TestGuardThrottles(t *testing.T) {
	guard, limiter := newTestGuard(fakeAccess{subscription: true})

	mux := http.NewServeMux()
	mux.Handle("POST /login", guard.Protect("POST /login", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), Throttle(2, time.Minute)))

	send := func() *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, httptest.NewRequest("POST", "/login", nil))
		return response
	}

	first := send()
	if first.Code != 204 || first.Header().Get("X-RateLimit-Limit") != "2" ||
		first.Header().Get("X-RateLimit-Remaining") != "1" || first.Header().Get("X-RateLimit-Reset") != "60" {
		t.Fatalf("first = %d %v", first.Code, first.Header())
	}
	send()

	blocked := send()
	if blocked.Code != 429 || blocked.Body.String() != `{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}` {
		t.Fatalf("blocked = %d %s", blocked.Code, blocked.Body)
	}
	if blocked.Header().Get("Retry-After") != "60" || blocked.Header().Get("X-RateLimit-Limit") != "" {
		t.Fatalf("blocked headers = %v", blocked.Header())
	}

	key := limiter.lastKey
	response, _ := serve(guard, "GET", "/other", "/other", "")
	if limiter.lastKey == key || response.Header().Get("X-RateLimit-Limit") != "300" {
		t.Fatalf("another route must have its own counter and the global limit")
	}

	limiter.lastKey = ""
	serve(guard, "GET", "/free", "/free", "", SkipThrottle())
	if limiter.lastKey != "" {
		t.Fatalf("SkipThrottle must not count")
	}
}

func TestClientIP(t *testing.T) {
	tests := []struct {
		name      string
		hops      int
		forwarded []string
		want      string
	}{
		{name: "no proxy", hops: 0, forwarded: []string{"203.0.113.9"}, want: "10.0.0.1"},
		{name: "one hop", hops: 1, forwarded: []string{"203.0.113.9, 198.51.100.2"}, want: "198.51.100.2"},
		{name: "two hops", hops: 2, forwarded: []string{"203.0.113.9, 198.51.100.2"}, want: "203.0.113.9"},
		{name: "two headers", hops: 2, forwarded: []string{"203.0.113.9", "198.51.100.2"}, want: "203.0.113.9"},
		{name: "more hops than addresses", hops: 5, forwarded: []string{"203.0.113.9"}, want: "203.0.113.9"},
		{name: "one hop without header", hops: 1, want: "10.0.0.1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest("GET", "/", nil)
			request.RemoteAddr = "10.0.0.1:5000"
			for _, value := range tt.forwarded {
				request.Header.Add("X-Forwarded-For", value)
			}
			if got := clientIP(request, tt.hops); got != tt.want {
				t.Fatalf("clientIP = %q, want %q", got, tt.want)
			}
		})
	}
}
