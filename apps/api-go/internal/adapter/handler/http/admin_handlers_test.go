package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
	"api-go/internal/service"
)

func TestAdminListQuery(t *testing.T) {
	tests := []struct {
		query    string
		search   string
		role     string
		active   string
		page     domain.PageRequest
		messages []string
	}{
		{query: "", page: domain.PageRequest{Page: 1, PageSize: 20}},
		{query: "q=ana&role=ADMIN&active=false&page=3&pageSize=50", search: "ana", role: "ADMIN", active: "false", page: domain.PageRequest{Page: 3, PageSize: 50}},
		{query: "active=true&page=%202%20&pageSize=1.0", active: "true", page: domain.PageRequest{Page: 2, PageSize: 1}},
		{query: "q=a&q=b", search: "a,b", page: domain.PageRequest{Page: 1, PageSize: 20}},
		{query: "q=" + strings.Repeat("x", 121), messages: []string{"MAX_LENGTH"}},
		{query: "role=OWNER", messages: []string{"INVALID_ROLE"}},
		{query: "role=", messages: []string{"INVALID_ROLE"}},
		{query: "active=yes", messages: []string{"INVALID_TYPE"}},
		{query: "active=TRUE", messages: []string{"INVALID_TYPE"}},
		{query: "page=abc", messages: []string{"INVALID_TYPE"}},
		{query: "page=1.5", messages: []string{"INVALID_TYPE"}},
		{query: "page=Infinity", messages: []string{"INVALID_TYPE"}},
		{query: "page=0", messages: []string{"MIN_LENGTH"}},
		{query: "page=", messages: []string{"MIN_LENGTH"}},
		{query: "page=1&page=2", messages: []string{"INVALID_TYPE"}},
		{query: "pageSize=101", messages: []string{"MAX_LENGTH"}},
		{query: "sort=name&page=0&limit=5", messages: []string{"property limit should not exist", "property sort should not exist", "MIN_LENGTH"}},
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			values, _ := url.ParseQuery(tt.query)
			query := newAdminListQuery(values, "q", "role", "active", "page", "pageSize")
			search := query.text("q", 120)
			role := query.oneOf("role", adminRoles, domain.CodeInvalidRole)
			active := query.boolean("active")
			page := query.page()
			err := query.err()

			if tt.messages != nil {
				var reqErr *requestError
				if !errors.As(err, &reqErr) || !slices.Equal(reqErr.validation, tt.messages) {
					t.Fatalf("err = %v, want %v", err, tt.messages)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			activeText := ""
			if active != nil {
				activeText = map[bool]string{true: "true", false: "false"}[*active]
			}
			if search != tt.search || role != tt.role || activeText != tt.active || page != tt.page {
				t.Fatalf("got q=%q role=%q active=%q page=%+v", search, role, activeText, page)
			}
		})
	}
}

type adminTesters struct {
	ports.BetaTesterRepository
	added []string
}

func (f *adminTesters) List(context.Context, string, domain.PageRequest) ([]domain.BetaTester, int, error) {
	note := "Bar Pepe"
	createdAt := domain.NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC))
	return []domain.BetaTester{{ID: "b1", Email: "tester@bar.com", Note: &note, CreatedAt: createdAt}}, 1, nil
}

func (f *adminTesters) FindSignUps(context.Context, []string) ([]domain.BetaSignUp, error) {
	return nil, nil
}

func (f *adminTesters) FindByEmail(context.Context, string) (*domain.BetaTester, error) {
	return nil, nil
}

func (f *adminTesters) FindByID(_ context.Context, id string) (*domain.BetaTester, error) {
	if id != "b1" {
		return nil, nil
	}
	return &domain.BetaTester{ID: "b1", Email: "tester@bar.com"}, nil
}

func (f *adminTesters) Add(_ context.Context, email string, _ *string, _ string) (string, error) {
	f.added = append(f.added, email)
	return "b2", nil
}

func (f *adminTesters) Remove(context.Context, string) error { return nil }

type adminEstablishments struct {
	ports.AdminEstablishmentRepository
}

func (adminEstablishments) FindByID(_ context.Context, id string) (*domain.AdminEstablishmentRow, error) {
	if id != "e1" {
		return nil, nil
	}
	return &domain.AdminEstablishmentRow{ID: "e1", Name: "Bar Pepe"}, nil
}

func (adminEstablishments) Settings(context.Context, string) (*domain.AdminEstablishmentSettings, error) {
	return nil, nil
}

func (adminEstablishments) Rename(context.Context, string, string) error { return nil }

func (adminEstablishments) UpdateModules(_ context.Context, id string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error) {
	return domain.AdminEstablishmentSettings{EstablishmentID: id, Modules: modules, Language: "es"}, nil
}

func (adminEstablishments) GrantPlan(context.Context, string, domain.ManualPlanGrant) error {
	return nil
}

type adminPublisher struct{}

func (adminPublisher) Publish(context.Context, ports.Event) {}

type adminNoCache struct{}

func (adminNoCache) Get(context.Context, string, any) bool { return false }
func (adminNoCache) Set(context.Context, string, any)      {}
func (adminNoCache) Forget(context.Context, ...string)     {}

func newAdminServer(access ports.SecurityService) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewAdminOverviewHandler(service.NewAdminMetricsService(nil), service.NewAdminAuditService(nil)).RegisterRoutes(mux, guard)
	NewAdminUserHandler(service.NewAdminUserService(nil, nil, adminPublisher{})).RegisterRoutes(mux, guard)
	NewAdminBetaTesterHandler(service.NewBetaTesterService(&adminTesters{}, adminPublisher{}, true)).RegisterRoutes(mux, guard)
	NewAdminEstablishmentHandler(service.NewAdminEstablishmentService(adminEstablishments{}, nil, adminPublisher{}, adminNoCache{})).RegisterRoutes(mux, guard)
	return mux
}

var adminRoutes = []string{
	"GET /api/v1/admin/overview",
	"GET /api/v1/admin/audit",
	"GET /api/v1/admin/users",
	"GET /api/v1/admin/users/u2",
	"PATCH /api/v1/admin/users/u2",
	"GET /api/v1/admin/beta-testers",
	"POST /api/v1/admin/beta-testers",
	"DELETE /api/v1/admin/beta-testers/b1",
	"GET /api/v1/admin/establishments",
	"GET /api/v1/admin/establishments/e1",
	"PATCH /api/v1/admin/establishments/e1",
	"PATCH /api/v1/admin/establishments/e1/modules",
	"POST /api/v1/admin/establishments/e1/plan",
	"POST /api/v1/admin/establishments/e1/plan/revoke",
}

func TestAdminRoutesAreForPlatformAdmins(t *testing.T) {
	server := newAdminServer(fakeAccess{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	for _, route := range adminRoutes {
		method, target, _ := strings.Cut(route, " ")

		if response := send(server, method, target, "", nil); response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}

		response := send(server, method, target, "", signedIn)
		want := `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`
		if response.Code != http.StatusForbidden || response.Body.String() != want {
			t.Errorf("%s as a plain user = %d %s", route, response.Code, response.Body)
		}
	}
}

func TestAdminValidation(t *testing.T) {
	server := newAdminServer(catalogAccess{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	tests := []struct {
		name  string
		route string
		body  string
		want  string
	}{
		{name: "an unknown audit action", route: "GET /api/v1/admin/audit?action=DELETED",
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "an audit target id too long", route: "GET /api/v1/admin/audit?targetType=TIME_ENTRY&targetId=" + strings.Repeat("x", 65),
			want: `{"message":["MAX_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "an unknown user filter", route: "GET /api/v1/admin/users?name=ana",
			want: `{"message":["property name should not exist"],"error":"Bad Request","statusCode":400}`},
		{name: "an unknown billing source", route: "GET /api/v1/admin/establishments?billingSource=PAYPAL&status=GONE",
			want: `{"message":["INVALID_TYPE","INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "a page too big", route: "GET /api/v1/admin/beta-testers?pageSize=500",
			want: `{"message":["MAX_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "a role that does not exist", route: "PATCH /api/v1/admin/users/u2", body: `{"role":"OWNER"}`,
			want: `{"message":["INVALID_ROLE"],"error":"Bad Request","statusCode":400}`},
		{name: "active that is not a boolean", route: "PATCH /api/v1/admin/users/u2", body: `{"active":"no"}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "editing their own account", route: "PATCH /api/v1/admin/users/u1", body: `{"active":false}`,
			want: `{"message":"CANNOT_EDIT_OWN_ADMIN_ACCOUNT","error":"Bad Request","statusCode":400}`},
		{name: "a tester that is not an address", route: "POST /api/v1/admin/beta-testers", body: `{"email":"not-an-email"}`,
			want: `{"message":["INVALID_EMAIL"],"error":"Bad Request","statusCode":400}`},
		{name: "a tester without an address", route: "POST /api/v1/admin/beta-testers", body: `{"note":"x"}`,
			want: `{"message":["INVALID_EMAIL"],"error":"Bad Request","statusCode":400}`},
		{name: "a tester note too long", route: "POST /api/v1/admin/beta-testers", body: `{"email":"a@b.com","note":"` + strings.Repeat("x", 201) + `"}`,
			want: `{"message":["MAX_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "a tester that is not there", route: "DELETE /api/v1/admin/beta-testers/b9",
			want: `{"message":"BETA_TESTER_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "a name too short", route: "PATCH /api/v1/admin/establishments/e1", body: `{"name":"ab"}`,
			want: `{"message":["MIN_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "no name", route: "PATCH /api/v1/admin/establishments/e1", body: `{}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "renaming an establishment that does not exist", route: "PATCH /api/v1/admin/establishments/e9", body: `{"name":"Bar Paco"}`,
			want: `{"message":"ESTABLISHMENT_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "an unknown module", route: "PATCH /api/v1/admin/establishments/e1/modules", body: `{"modules":["KITCHEN"]}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "a module twice", route: "PATCH /api/v1/admin/establishments/e1/modules", body: `{"modules":["ORDERS","ORDERS"]}`,
			want: `{"message":["All modules's elements must be unique"],"error":"Bad Request","statusCode":400}`},
		{name: "no modules", route: "PATCH /api/v1/admin/establishments/e1/modules", body: `{}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "granting the free plan", route: "POST /api/v1/admin/establishments/e1/plan", body: `{"plan":"FREE"}`,
			want: `{"message":["INVALID_SUBSCRIPTION_PLAN"],"error":"Bad Request","statusCode":400}`},
		{name: "granting no plan", route: "POST /api/v1/admin/establishments/e1/plan", body: `{}`,
			want: `{"message":["INVALID_SUBSCRIPTION_PLAN"],"error":"Bad Request","statusCode":400}`},
		{name: "a grant too long", route: "POST /api/v1/admin/establishments/e1/plan", body: `{"plan":"PRO","durationDays":3651}`,
			want: `{"message":["MAX_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "a grant of half a day", route: "POST /api/v1/admin/establishments/e1/plan", body: `{"plan":"PRO","durationDays":0.5}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "revoking with a reason that is not text", route: "POST /api/v1/admin/establishments/e1/plan/revoke", body: `{"reason":5}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "revoking a grant that is not there", route: "POST /api/v1/admin/establishments/e1/plan/revoke", body: `{}`,
			want: `{"message":"NO_MANUAL_GRANT","error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")
			response := send(server, method, target, tt.body, signedIn)
			if response.Body.String() != tt.want {
				t.Errorf("%s = %d %s", tt.route, response.Code, response.Body)
			}
		})
	}
}

func TestAdminAuditMetadataIsWrittenAsStored(t *testing.T) {
	entry := domain.AdminAuditLogEntry{ID: "a1", Metadata: json.RawMessage(`{"to": "Bar & Grill <1>", "from": "Bar"}`)}

	response := httptest.NewRecorder()
	writeJSON(response, http.StatusOK, entry)

	want := `"metadata":{"to":"Bar & Grill <1>","from":"Bar"}`
	if !strings.Contains(response.Body.String(), want) || !strings.Contains(response.Body.String(), `"reason":null`) {
		t.Errorf("got %s", response.Body)
	}

	response = httptest.NewRecorder()
	writeJSON(response, http.StatusOK, domain.AdminAuditLogEntry{ID: "a2"})
	if !strings.Contains(response.Body.String(), `"metadata":null`) {
		t.Errorf("without metadata = %s", response.Body)
	}
}

func TestAdminResponses(t *testing.T) {
	server := newAdminServer(catalogAccess{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	tests := []struct {
		name   string
		route  string
		body   string
		status int
		want   string
	}{
		{name: "the allowlist", route: "GET /api/v1/admin/beta-testers?q=%20bar%20", status: http.StatusOK,
			want: `{"items":[{"id":"b1","email":"tester@bar.com","note":"Bar Pepe","createdAt":"2026-09-27T10:00:00.000Z",` +
				`"invitedByName":null,"userId":null,"signedUpAt":null}],"total":1,"page":1,"pageSize":20,"enforcing":true}`},
		{name: "adding a tester", route: "POST /api/v1/admin/beta-testers", body: `{"email":"New@Bar.com"}`, status: http.StatusNoContent},
		{name: "removing a tester", route: "DELETE /api/v1/admin/beta-testers/b1", status: http.StatusNoContent},
		{name: "renaming", route: "PATCH /api/v1/admin/establishments/e1", body: `{"name":"Bar Paco"}`, status: http.StatusOK},
		{name: "changing the modules", route: "PATCH /api/v1/admin/establishments/e1/modules", body: `{"modules":["ORDERS"]}`, status: http.StatusOK,
			want: `{"establishmentId":"e1","modules":["TIME_TRACKING","ORDERS","INVENTORY"],"language":"es","markSoldOut":false,"configuredAt":null}`},
		{name: "granting a plan", route: "POST /api/v1/admin/establishments/e1/plan", body: `{"plan":"PRO","durationDays":null}`, status: http.StatusCreated},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")
			response := send(server, method, target, tt.body, signedIn)
			if response.Code != tt.status || response.Body.String() != tt.want {
				t.Errorf("%s = %d %s", tt.route, response.Code, response.Body)
			}
		})
	}
}
