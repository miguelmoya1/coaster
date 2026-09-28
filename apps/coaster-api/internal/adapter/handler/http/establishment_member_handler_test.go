package http

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
	"coaster-api/internal/service"
)

type memberRouteCaller struct {
	user domain.User
}

func (c memberRouteCaller) Resolve(_ context.Context, authorization string) (*domain.Caller, error) {
	if authorization != "Bearer good" {
		return nil, nil
	}
	user := c.user
	return &domain.Caller{Claims: domain.SessionClaims{Sub: user.ID, Sid: "s1"}, User: &user}, nil
}

type memberRouteAccess struct {
	fakeAccess
	platformRole domain.Role
	role         domain.EstablishmentRole
}

func (a memberRouteAccess) UserRole(context.Context, string) (domain.Role, error) {
	return a.platformRole, nil
}

func (a memberRouteAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	if a.role == "" {
		return nil, nil
	}
	return &domain.Membership{Role: string(a.role), Active: true}, nil
}

type memberRouteRows struct {
	ports.EstablishmentMemberRepository
}

var memberRouteRowsOfE1 = []domain.EstablishmentMember{
	{ID: "m-ana", UserID: "u1", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner, Active: true, UserName: "Ana", UserImage: "https://example.com/ana.png", UserEmail: "ana@example.com"},
	{ID: "m-sergio", UserID: "u2", EstablishmentID: "e1", Role: domain.EstablishmentRoleStaff, Active: true, Pending: true, UserName: "Sergio", UserEmail: "sergio@example.com"},
}

func (memberRouteRows) ListActive(_ context.Context, establishmentID string) ([]domain.EstablishmentMember, error) {
	if establishmentID != "e1" {
		return []domain.EstablishmentMember{}, nil
	}
	return memberRouteRowsOfE1, nil
}

func (memberRouteRows) FindByUser(_ context.Context, establishmentID, userID string) (*domain.EstablishmentMember, error) {
	for _, member := range memberRouteRowsOfE1 {
		if member.EstablishmentID == establishmentID && member.UserID == userID {
			return &member, nil
		}
	}
	return nil, nil
}

func (memberRouteRows) FindInvite(_ context.Context, _, memberID string) (*domain.MemberInvite, error) {
	if memberID != "m-sergio" {
		return nil, nil
	}
	return &domain.MemberInvite{ID: "m-sergio", UserID: "u2", Active: true, UserEmail: "sergio@example.com", UserActive: true, Pending: true, EstablishmentName: "Bar Pepe"}, nil
}

func (memberRouteRows) HasMemberWithEmail(context.Context, string, string) (bool, error) {
	return false, nil
}

func (memberRouteRows) Invite(_ context.Context, invitation domain.MemberInvitation) (*domain.InvitedMember, error) {
	return &domain.InvitedMember{ID: "m-new", UserID: "u-new", UserEmail: invitation.Email, UserName: invitation.UserName, EstablishmentName: "Bar Pepe"}, nil
}

func (memberRouteRows) UpdateRole(context.Context, string, string, domain.EstablishmentRole) (bool, error) {
	return true, nil
}

func (memberRouteRows) Remove(context.Context, string, string) (bool, error) { return true, nil }

type memberRouteMailer struct {
	ports.Mailer
	down bool
}

func (m memberRouteMailer) SendInvite(context.Context, string, domain.InviteEmail, string) error {
	if m.down {
		return errors.New("resend refused it")
	}
	return nil
}

type memberRouteTokens struct {
	ports.AuthTokenRepository
}

func (memberRouteTokens) Issue(context.Context, string, domain.AuthTokenPurpose) (string, error) {
	return "a-token", nil
}

type memberRouteEvents struct{}

func (memberRouteEvents) Publish(context.Context, any) {}

func newMemberRouteServer(caller domain.User, access memberRouteAccess, mailer memberRouteMailer) http.Handler {
	members := service.NewEstablishmentMemberService(service.EstablishmentMemberDependencies{
		Members: memberRouteRows{},
		Tokens:  memberRouteTokens{},
		Mailer:  mailer,
		Events:  memberRouteEvents{},
	})

	guard := middleware.NewGuard(memberRouteCaller{user: caller}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewEstablishmentMemberHandler(members).RegisterRoutes(mux, guard)
	return mux
}

func TestEstablishmentMemberRoutes(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	base := "/api/v1/establishments/e1/members"

	tests := []struct {
		name   string
		role   domain.EstablishmentRole
		route  string
		body   string
		status int
		want   string
	}{
		{name: "staff sees the members", role: domain.EstablishmentRoleStaff, route: "GET " + base, status: 200},
		{name: "staff sees their own membership", role: domain.EstablishmentRoleStaff, route: "GET " + base + "/me", status: 200},
		{name: "staff cannot invite", role: domain.EstablishmentRoleStaff, route: "POST " + base, body: `{"email":"new@example.com"}`, status: 403,
			want: `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`},
		{name: "staff cannot resend an invitation", role: domain.EstablishmentRoleStaff, route: "POST " + base + "/m-sergio/invite", status: 403},
		{name: "a manager invites", role: domain.EstablishmentRoleManager, route: "POST " + base, body: `{"email":"new@example.com","role":"MANAGER"}`, status: 201},
		{name: "a manager resends an invitation", role: domain.EstablishmentRoleManager, route: "POST " + base + "/m-sergio/invite", status: 201},
		{name: "a manager cannot change roles", role: domain.EstablishmentRoleManager, route: "PATCH " + base + "/m-sergio", body: `{"role":"MANAGER"}`, status: 403},
		{name: "a manager cannot remove anybody", role: domain.EstablishmentRoleManager, route: "DELETE " + base + "/m-sergio", status: 403},
		{name: "an owner changes a role", role: domain.EstablishmentRoleOwner, route: "PATCH " + base + "/m-sergio", body: `{"role":"MANAGER"}`, status: 200},
		{name: "an owner removes a member", role: domain.EstablishmentRoleOwner, route: "DELETE " + base + "/m-sergio", status: 200},
		{name: "removing nobody is a bad request", role: domain.EstablishmentRoleOwner, route: "DELETE " + base + "/missing", status: 400,
			want: `{"message":"MEMBER_NOT_FOUND","error":"Bad Request","statusCode":400}`},
		{name: "changing the role of nobody is not found", role: domain.EstablishmentRoleOwner, route: "PATCH " + base + "/missing", body: `{"role":"STAFF"}`, status: 404,
			want: `{"message":"MEMBER_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "resending to nobody is not found", role: domain.EstablishmentRoleOwner, route: "POST " + base + "/missing/invite", status: 404,
			want: `{"message":"MEMBER_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "somebody from outside cannot see the members", route: "GET " + base, status: 403,
			want: `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{name: "somebody from outside has no membership", route: "GET " + base + "/me", status: 403},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newMemberRouteServer(testUser, memberRouteAccess{platformRole: domain.RoleUser, role: tt.role}, memberRouteMailer{})
			method, target, _ := strings.Cut(tt.route, " ")

			if response := send(server, method, target, tt.body, nil); response.Code != http.StatusUnauthorized {
				t.Fatalf("without a token = %d", response.Code)
			}

			response := send(server, method, target, tt.body, signedIn)
			if response.Code != tt.status {
				t.Fatalf("status = %d %s, want %d", response.Code, response.Body, tt.status)
			}
			if tt.want != "" && response.Body.String() != tt.want {
				t.Errorf("body = %s\nwant %s", response.Body, tt.want)
			}
			if tt.status < 300 && method != "GET" && response.Body.Len() != 0 {
				t.Errorf("body = %s, want none", response.Body)
			}
		})
	}
}

func TestEstablishmentMemberValidation(t *testing.T) {
	server := newMemberRouteServer(testUser, memberRouteAccess{platformRole: domain.RoleUser, role: domain.EstablishmentRoleOwner}, memberRouteMailer{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	tests := []struct {
		name  string
		route string
		body  string
		want  string
	}{
		{"an email that is not one", "POST /api/v1/establishments/e1/members", `{"email":"not-an-email","role":"STAFF"}`, `["INVALID_EMAIL"]`},
		{"an empty email", "POST /api/v1/establishments/e1/members", `{"email":""}`, `["REQUIRED"]`},
		{"no email", "POST /api/v1/establishments/e1/members", `{"role":"STAFF"}`, `["REQUIRED"]`},
		{"an email that is a number", "POST /api/v1/establishments/e1/members", `{"email":5}`, `["INVALID_EMAIL"]`},
		{"an invitation as platform admin", "POST /api/v1/establishments/e1/members", `{"email":"new@example.com","role":"ADMIN"}`, `["INVALID_ROLE"]`},
		{"an empty role", "POST /api/v1/establishments/e1/members", `{"email":"new@example.com","role":""}`, `["INVALID_ROLE"]`},
		{"an unknown property", "POST /api/v1/establishments/e1/members", `{"email":"new@example.com","name":"New"}`, `["property name should not exist"]`},
		{"a role change without a role", "PATCH /api/v1/establishments/e1/members/m-sergio", `{}`, `["INVALID_ROLE"]`},
		{"a role change to platform admin", "PATCH /api/v1/establishments/e1/members/m-sergio", `{"role":"ADMIN"}`, `["INVALID_ROLE"]`},
		{"a role that is a number", "PATCH /api/v1/establishments/e1/members/m-sergio", `{"role":1}`, `["INVALID_ROLE"]`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, signedIn)
			want := `{"message":` + tt.want + `,"error":"Bad Request","statusCode":400}`
			if response.Code != http.StatusBadRequest || response.Body.String() != want {
				t.Errorf("%s = %d %s\nwant %s", tt.route, response.Code, response.Body, want)
			}
		})
	}
}

func TestEstablishmentMemberJSON(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	owner := memberRouteAccess{platformRole: domain.RoleUser, role: domain.EstablishmentRoleOwner}

	server := newMemberRouteServer(testUser, owner, memberRouteMailer{})

	list := send(server, "GET", "/api/v1/establishments/e1/members", "", signedIn)
	wantList := `[{"id":"m-ana","userId":"u1","establishmentId":"e1","role":"OWNER","active":true,"pending":false,"userName":"Ana","userImage":"https://example.com/ana.png","userEmail":"ana@example.com"},` +
		`{"id":"m-sergio","userId":"u2","establishmentId":"e1","role":"STAFF","active":true,"pending":true,"userName":"Sergio","userImage":"","userEmail":"sergio@example.com"}]`
	if list.Code != http.StatusOK || list.Body.String() != wantList {
		t.Errorf("list = %d %s\nwant %s", list.Code, list.Body, wantList)
	}

	me := send(server, "GET", "/api/v1/establishments/e1/members/me", "", signedIn)
	wantMe := `{"id":"m-ana","userId":"u1","establishmentId":"e1","role":"OWNER","active":true,"pending":false,"userName":"Ana","userImage":"https://example.com/ana.png","userEmail":"ana@example.com"}`
	if me.Code != http.StatusOK || me.Body.String() != wantMe {
		t.Errorf("me = %d %s\nwant %s", me.Code, me.Body, wantMe)
	}

	empty := send(server, "GET", "/api/v1/establishments/e2/members", "", signedIn)
	if empty.Code != http.StatusOK || empty.Body.String() != "[]" {
		t.Errorf("an establishment without members = %d %s", empty.Code, empty.Body)
	}

	admin := domain.User{ID: "admin-1", Email: "admin@example.com", Name: "Admin", Active: true, Role: domain.RoleAdmin, Language: "es"}
	adminServer := newMemberRouteServer(admin, memberRouteAccess{platformRole: domain.RoleAdmin}, memberRouteMailer{})

	standIn := send(adminServer, "GET", "/api/v1/establishments/e1/members/me", "", signedIn)
	wantStandIn := `{"id":"mock-admin-member","userId":"admin-1","establishmentId":"e1","role":"OWNER","active":true,"pending":false,"userName":"Admin","userEmail":"admin@example.com","userImage":""}`
	if standIn.Code != http.StatusOK || standIn.Body.String() != wantStandIn {
		t.Errorf("admin me = %d %s\nwant %s", standIn.Code, standIn.Body, wantStandIn)
	}
}

func TestEstablishmentMemberResendInviteEmailFails(t *testing.T) {
	owner := memberRouteAccess{platformRole: domain.RoleUser, role: domain.EstablishmentRoleOwner}
	server := newMemberRouteServer(testUser, owner, memberRouteMailer{down: true})

	response := send(server, "POST", "/api/v1/establishments/e1/members/m-sergio/invite", "", map[string]string{"Authorization": "Bearer good"})

	want := `{"message":"INVITE_EMAIL_FAILED","error":"Service Unavailable","statusCode":503}`
	if response.Code != http.StatusServiceUnavailable || response.Body.String() != want {
		t.Errorf("resend = %d %s\nwant %s", response.Code, response.Body, want)
	}
}
