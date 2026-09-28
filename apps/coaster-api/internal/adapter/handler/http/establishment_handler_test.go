package http

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
	"coaster-api/internal/service"
)

type establishmentAccess struct {
	fakeAccess
	role       domain.Role
	membership *domain.Membership
}

func (a establishmentAccess) UserRole(context.Context, string) (domain.Role, error) {
	return a.role, nil
}

func (a establishmentAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	return a.membership, nil
}

type establishmentRows struct {
	created []domain.NewEstablishment
}

var establishmentTime = domain.NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC))

func (r *establishmentRows) Create(_ context.Context, establishment domain.NewEstablishment) (domain.Establishment, error) {
	r.created = append(r.created, establishment)
	return domain.Establishment{ID: "e-new", Name: establishment.Name}, nil
}

func (r *establishmentRows) ListForMember(context.Context, string) ([]domain.Establishment, error) {
	return []domain.Establishment{{ID: "e1", Name: "Bar Pepe", CreatedAt: establishmentTime, UpdatedAt: establishmentTime}}, nil
}

func (r *establishmentRows) FindByID(_ context.Context, establishmentID string) (*domain.Establishment, error) {
	if establishmentID != "e1" {
		return nil, nil
	}
	return &domain.Establishment{ID: "e1", Name: "Bar Pepe", CreatedAt: establishmentTime, UpdatedAt: establishmentTime}, nil
}

func (r *establishmentRows) FindSettings(context.Context, string) (*domain.EstablishmentSettings, error) {
	return nil, nil
}

func (r *establishmentRows) SaveSettings(_ context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error) {
	saved := domain.EstablishmentSettings{EstablishmentID: establishmentID, Modules: changes.Modules, Language: "es", ConfiguredAt: &establishmentTime}
	if changes.Language != nil {
		saved.Language = *changes.Language
	}
	if changes.MarkSoldOut != nil {
		saved.MarkSoldOut = *changes.MarkSoldOut
	}
	return saved, nil
}

type establishmentEvents struct{}

func (establishmentEvents) Publish(context.Context, any) {}

func newEstablishmentServer(access ports.SecurityService, rows *establishmentRows) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewEstablishmentHandler(service.NewEstablishmentService(rows, establishmentEvents{}, nil)).RegisterRoutes(mux, guard)
	return mux
}

func TestEstablishmentRoutes(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	owner := establishmentAccess{role: domain.RoleUser, membership: &domain.Membership{Role: "OWNER", Active: true}}
	staff := establishmentAccess{role: domain.RoleUser, membership: &domain.Membership{Role: "STAFF", Active: true}}
	stranger := establishmentAccess{role: domain.RoleUser}
	admin := establishmentAccess{role: domain.RoleAdmin}

	tests := []struct {
		name    string
		access  establishmentAccess
		route   string
		body    string
		headers map[string]string
		status  int
		want    string
	}{
		{name: "create without a token", access: owner, route: "POST /api/v1/establishments", body: `{"name":"Bar Pepe"}`,
			status: 401, want: `{"message":"INVALID_CREDENTIALS","error":"Unauthorized","statusCode":401}`},
		{name: "create", access: stranger, route: "POST /api/v1/establishments", body: `{"name":"Bar Pepe"}`, headers: signedIn,
			status: 201, want: ``},
		{name: "list without a token", access: owner, route: "GET /api/v1/establishments",
			status: 401, want: `{"message":"INVALID_CREDENTIALS","error":"Unauthorized","statusCode":401}`},
		{name: "list", access: stranger, route: "GET /api/v1/establishments", headers: signedIn,
			status: 200, want: `[{"id":"e1","name":"Bar Pepe","createdAt":"2026-09-27T10:00:00.000Z","updatedAt":"2026-09-27T10:00:00.000Z"}]`},
		{name: "get as a member", access: staff, route: "GET /api/v1/establishments/e1", headers: signedIn,
			status: 200, want: `{"id":"e1","name":"Bar Pepe","createdAt":"2026-09-27T10:00:00.000Z","updatedAt":"2026-09-27T10:00:00.000Z"}`},
		{name: "get as someone who is not a member", access: stranger, route: "GET /api/v1/establishments/e1", headers: signedIn,
			status: 403, want: `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{name: "get one that does not exist as an admin", access: admin, route: "GET /api/v1/establishments/nope", headers: signedIn,
			status: 404, want: `{"message":"ESTABLISHMENT_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "settings of one that does not exist as an admin", access: admin, route: "GET /api/v1/establishments/nope/settings", headers: signedIn,
			status: 404, want: `{"message":"ESTABLISHMENT_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "save settings of one that does not exist as an admin", access: admin, route: "PATCH /api/v1/establishments/nope/settings", body: `{"modules":[]}`, headers: signedIn,
			status: 404, want: `{"message":"ESTABLISHMENT_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "settings without a row", access: staff, route: "GET /api/v1/establishments/e1/settings", headers: signedIn,
			status: 200, want: `{"establishmentId":"e1","modules":["TIME_TRACKING","ORDERS","INVENTORY"],"language":"es","markSoldOut":false,"configuredAt":null}`},
		{name: "settings as someone who is not a member", access: stranger, route: "GET /api/v1/establishments/e1/settings", headers: signedIn,
			status: 403, want: `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{name: "save settings as staff", access: staff, route: "PATCH /api/v1/establishments/e1/settings", body: `{"modules":[]}`, headers: signedIn,
			status: 403, want: `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`},
		{name: "save settings as the owner", access: owner, route: "PATCH /api/v1/establishments/e1/settings",
			body: `{"modules":["ORDERS"],"language":"en","markSoldOut":true}`, headers: signedIn,
			status: 200, want: `{"establishmentId":"e1","modules":["TIME_TRACKING","ORDERS","INVENTORY"],"language":"en","markSoldOut":true,"configuredAt":"2026-09-27T10:00:00.000Z"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newEstablishmentServer(tt.access, &establishmentRows{})
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, tt.headers)

			if response.Code != tt.status || response.Body.String() != tt.want {
				t.Errorf("got %d %s, want %d %s", response.Code, response.Body, tt.status, tt.want)
			}
		})
	}
}

func TestEstablishmentCreateTakesTheUser(t *testing.T) {
	rows := &establishmentRows{}
	server := newEstablishmentServer(establishmentAccess{role: domain.RoleUser}, rows)

	response := send(server, "POST", "/api/v1/establishments", `{"name":"Bar Pepe"}`, map[string]string{"Authorization": "Bearer good"})

	if response.Code != http.StatusCreated {
		t.Fatalf("got %d %s", response.Code, response.Body)
	}
	if len(rows.created) != 1 || rows.created[0].Name != "Bar Pepe" || rows.created[0].OwnerID != testUser.ID || rows.created[0].Language != "es" {
		t.Errorf("created = %+v", rows.created)
	}
}

func TestEstablishmentValidation(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	server := newEstablishmentServer(establishmentAccess{role: domain.RoleAdmin}, &establishmentRows{})

	tests := []struct {
		name  string
		route string
		body  string
		want  string
	}{
		{name: "a name too short", route: "POST /api/v1/establishments", body: `{"name":"A"}`,
			want: `{"message":["MIN_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "a name too long", route: "POST /api/v1/establishments", body: `{"name":"` + strings.Repeat("a", 51) + `"}`,
			want: `{"message":["MAX_LENGTH"],"error":"Bad Request","statusCode":400}`},
		{name: "no name", route: "POST /api/v1/establishments", body: `{}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "a name that is not text", route: "POST /api/v1/establishments", body: `{"name":5}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "a field it does not know", route: "POST /api/v1/establishments", body: `{"name":"Bar Pepe","taxId":"B123"}`,
			want: `{"message":["property taxId should not exist"],"error":"Bad Request","statusCode":400}`},
		{name: "no modules", route: "PATCH /api/v1/establishments/e1/settings", body: `{"markSoldOut":true}`,
			want: `{"message":["modules must be an array"],"error":"Bad Request","statusCode":400}`},
		{name: "a module it does not know", route: "PATCH /api/v1/establishments/e1/settings", body: `{"modules":["RESERVATIONS"]}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "a module twice", route: "PATCH /api/v1/establishments/e1/settings", body: `{"modules":["ORDERS","ORDERS"]}`,
			want: `{"message":["All modules's elements must be unique"],"error":"Bad Request","statusCode":400}`},
		{name: "a language the app does not speak", route: "PATCH /api/v1/establishments/e1/settings", body: `{"modules":[],"language":"de"}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "markSoldOut that is not a boolean", route: "PATCH /api/v1/establishments/e1/settings", body: `{"modules":[],"markSoldOut":"yes"}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, signedIn)

			if response.Code != http.StatusBadRequest || response.Body.String() != tt.want {
				t.Errorf("got %d %s, want %s", response.Code, response.Body, tt.want)
			}
		})
	}
}
