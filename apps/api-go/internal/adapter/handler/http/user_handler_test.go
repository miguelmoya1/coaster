package http

import (
	"context"
	"net/http"
	"reflect"
	"testing"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// userRows knows the users in ids and keeps the changes it was asked to write.
type userRows struct {
	ids     []string
	updates []domain.UserProfileChanges
}

func (r *userRows) Exists(_ context.Context, userID string) (bool, error) {
	for _, id := range r.ids {
		if id == userID {
			return true, nil
		}
	}
	return false, nil
}

func (r *userRows) UpdateProfile(_ context.Context, _ string, changes domain.UserProfileChanges) error {
	r.updates = append(r.updates, changes)
	return nil
}

func newUserServer(rows *userRows) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, fakeAccess{}, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewUserHandler(service.NewUserService(rows, establishmentEvents{}, nil)).RegisterRoutes(mux, guard)
	return mux
}

func TestUserRoutes(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}

	tests := []struct {
		name    string
		known   []string
		method  string
		body    string
		headers map[string]string
		status  int
		want    string
	}{
		{name: "me without a token", method: "GET",
			status: 200, want: `null`},
		{name: "me with a token that does not verify", method: "GET", headers: map[string]string{"Authorization": "Bearer bad"},
			status: 200, want: `null`},
		{name: "me", method: "GET", headers: signedIn,
			status: 200, want: `{"id":"u1","email":"ana@example.com","name":"Ana","active":true,"role":"USER","language":"es","emailVerified":false}`},
		{name: "update without a token", method: "PATCH", body: `{"name":"Ana María"}`,
			status: 401, want: `{"message":"INVALID_CREDENTIALS","error":"Unauthorized","statusCode":401}`},
		{name: "update", known: []string{"u1"}, method: "PATCH", body: `{"name":"Ana María"}`, headers: signedIn,
			status: 200, want: ``},
		{name: "update a user that no longer exists", method: "PATCH", body: `{"name":"Ana María"}`, headers: signedIn,
			status: 404, want: `{"message":"USER_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "a name that is not text", known: []string{"u1"}, method: "PATCH", body: `{"name":5}`, headers: signedIn,
			status: 400, want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "an empty name", known: []string{"u1"}, method: "PATCH", body: `{"name":""}`, headers: signedIn,
			status: 400, want: `{"message":"REQUIRED","error":"Bad Request","statusCode":400}`},
		{name: "a language the app does not speak", known: []string{"u1"}, method: "PATCH", body: `{"language":"fr"}`, headers: signedIn,
			status: 400, want: `{"message":"INVALID_TYPE","error":"Bad Request","statusCode":400}`},
		{name: "a field it does not know", known: []string{"u1"}, method: "PATCH", body: `{"role":"ADMIN"}`, headers: signedIn,
			status: 400, want: `{"message":["property role should not exist"],"error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newUserServer(&userRows{ids: tt.known})

			response := send(server, tt.method, "/api/v1/users/me", tt.body, tt.headers)

			if response.Code != tt.status || response.Body.String() != tt.want {
				t.Errorf("got %d %s, want %d %s", response.Code, response.Body, tt.status, tt.want)
			}
		})
	}
}

func TestUserUpdateReadsNulls(t *testing.T) {
	rows := &userRows{ids: []string{"u1"}}
	server := newUserServer(rows)

	response := send(server, "PATCH", "/api/v1/users/me", `{"name":"Ana María","photoUrl":null,"language":"en"}`,
		map[string]string{"Authorization": "Bearer good"})
	if response.Code != http.StatusOK {
		t.Fatalf("got %d %s", response.Code, response.Body)
	}

	name := "Ana María"
	english := "en"
	want := domain.UserProfileChanges{Name: &name, ClearPhotoURL: true, Language: &english}
	if len(rows.updates) != 1 || !reflect.DeepEqual(rows.updates[0], want) {
		t.Errorf("updates = %+v, want %+v", rows.updates, want)
	}
}
