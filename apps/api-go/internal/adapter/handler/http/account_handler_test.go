package http

import (
	"context"
	"net/http"
	"testing"

	"api-go/internal/core/domain"
	"api-go/internal/service"
)

type fakeAccount struct {
	AccountService
	gotPassword service.SetPasswordInput
	gotClosed   [3]string
	unlinked    domain.AuthProvider
}

func (f *fakeAccount) Account(context.Context, string) (domain.AccountSummary, error) {
	return domain.AccountSummary{Email: "ana@example.com", Name: "Ana", Identities: []domain.LinkedIdentity{}}, nil
}

func (f *fakeAccount) SetPassword(_ context.Context, input service.SetPasswordInput, _ domain.SessionOrigin) error {
	f.gotPassword = input
	return nil
}

func (f *fakeAccount) CloseSession(_ context.Context, userID, sessionID, currentSessionID string) error {
	f.gotClosed = [3]string{userID, sessionID, currentSessionID}
	return nil
}

func (f *fakeAccount) UnlinkIdentity(_ context.Context, _ string, provider domain.AuthProvider, _ domain.SessionOrigin) error {
	f.unlinked = provider
	return nil
}

func TestAccountHandler(t *testing.T) {
	account := &fakeAccount{}
	server := newAuthServer(&fakeAuth{}, account)
	signedIn := map[string]string{"Authorization": "Bearer good"}

	if response := send(server, "GET", "/api/v1/account", "", nil); response.Code != http.StatusUnauthorized {
		t.Fatalf("GET /account without a token = %d", response.Code)
	}

	response := send(server, "GET", "/api/v1/account", "", signedIn)
	want := `{"email":"ana@example.com","name":"Ana","emailVerified":false,"hasPassword":false,"identities":[]}`
	if response.Code != http.StatusOK || response.Body.String() != want {
		t.Fatalf("GET /account = %d %s", response.Code, response.Body)
	}

	response = send(server, "PUT", "/api/v1/account/password", `{"password":"a new password","currentPassword":"old one"}`, signedIn)
	if response.Code != http.StatusNoContent || account.gotPassword != (service.SetPasswordInput{
		UserID: "u1", SessionID: "s1", Password: "a new password", CurrentPassword: "old one",
	}) {
		t.Fatalf("PUT /account/password = %d, service got %+v", response.Code, account.gotPassword)
	}
	if response.Header().Get("X-RateLimit-Limit") != "5" {
		t.Fatalf("PUT /account/password must be limited to 5 per minute")
	}

	response = send(server, "DELETE", "/api/v1/account/sessions/s9", "", signedIn)
	if response.Code != http.StatusNoContent || account.gotClosed != [3]string{"u1", "s9", "s1"} {
		t.Fatalf("DELETE /account/sessions/s9 = %d, service got %v", response.Code, account.gotClosed)
	}

	response = send(server, "DELETE", "/api/v1/account/identities/FACEBOOK", "", signedIn)
	wantBody := `{"message":"Validation failed (enum string is expected)","error":"Bad Request","statusCode":400}`
	if response.Code != http.StatusBadRequest || response.Body.String() != wantBody {
		t.Fatalf("unlink an unknown provider = %d %s", response.Code, response.Body)
	}

	response = send(server, "DELETE", "/api/v1/account/identities/GOOGLE", "", signedIn)
	if response.Code != http.StatusNoContent || account.unlinked != domain.AuthProviderGoogle {
		t.Fatalf("unlink Google = %d", response.Code)
	}
}
