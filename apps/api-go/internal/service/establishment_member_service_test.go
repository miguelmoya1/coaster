package service

import (
	"context"
	"reflect"
	"testing"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type memberFixture struct {
	service  *EstablishmentMemberService
	repo     *fakeMemberRepository
	security *fakeSecurity
	cache    *fakeCache
	tokens   *memberTokens
	mailer   *memberMailer
	events   *memberEventRecorder
	realtime *memberRealtimeRecorder
}

// newMemberFixture starts with Olga as the owner of e1, Marta as its manager and Sergio on
// its staff.
func newMemberFixture() *memberFixture {
	repo := newFakeMemberRepository()
	repo.add(domain.EstablishmentMember{ID: "m-olga", UserID: "olga", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner, UserEmail: "olga@example.com"})
	repo.add(domain.EstablishmentMember{ID: "m-marta", UserID: "marta", EstablishmentID: "e1", Role: domain.EstablishmentRoleManager, UserEmail: "marta@example.com"})
	repo.add(domain.EstablishmentMember{ID: "m-sergio", UserID: "sergio", EstablishmentID: "e1", Role: domain.EstablishmentRoleStaff, UserEmail: "sergio@example.com"})

	security := &fakeSecurity{memberships: map[string]*domain.Membership{
		"e1/olga":     {Role: "OWNER", Active: true},
		"e1/marta":    {Role: "MANAGER", Active: true},
		"e1/sleeping": {Role: "OWNER", Active: false},
	}}
	securityService, cache := newTestSecurity(security, nil)

	f := &memberFixture{
		repo:     repo,
		security: security,
		cache:    cache,
		tokens:   &memberTokens{},
		mailer:   &memberMailer{},
		events:   &memberEventRecorder{},
		realtime: &memberRealtimeRecorder{},
	}
	f.service = NewEstablishmentMemberService(EstablishmentMemberDependencies{
		Members:  repo,
		Security: securityService,
		Tokens:   f.tokens,
		Mailer:   f.mailer,
		Cache:    cache,
		Events:   f.events,
		Realtime: f.realtime,
	})

	return f
}

func memberCaller(id string, role domain.Role) domain.User {
	return domain.User{ID: id, Email: id + "@example.com", Name: "Caller " + id, Role: role, Language: "en", Active: true}
}

func roleOf(role domain.EstablishmentRole) *domain.EstablishmentRole {
	return &role
}

func TestEstablishmentMemberMe(t *testing.T) {
	tests := []struct {
		name    string
		caller  domain.User
		wantID  string
		standIn bool
		code    string
	}{
		{"an active member gets their membership", memberCaller("marta", domain.RoleUser), "m-marta", false, ""},
		{"an inactive member is not found", memberCaller("paused", domain.RoleUser), "", false, domain.CodeMemberNotFound},
		{"somebody from outside is not found", memberCaller("stranger", domain.RoleUser), "", false, domain.CodeMemberNotFound},
		{"an admin from outside gets a made-up owner", memberCaller("admin", domain.RoleAdmin), domain.AdminStandInMemberID, true, ""},
		{"an admin who is an inactive member gets a made-up owner", memberCaller("paused", domain.RoleAdmin), domain.AdminStandInMemberID, true, ""},
		{"an admin who is an active member gets their membership", memberCaller("olga", domain.RoleAdmin), "m-olga", false, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()
			f.repo.rows = append(f.repo.rows, &fakeMemberRow{member: domain.EstablishmentMember{ID: "m-paused", UserID: "paused", EstablishmentID: "e1", Role: domain.EstablishmentRoleStaff}})

			member, err := f.service.Me(context.Background(), "e1", tt.caller)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) {
					t.Fatalf("err = %v, want %s", err, tt.code)
				}
				return
			}
			if err != nil || member.ID != tt.wantID || member.StandIn != tt.standIn {
				t.Fatalf("member = %+v, %v", member, err)
			}
			if tt.standIn && (member.Role != domain.EstablishmentRoleOwner || member.UserID != tt.caller.ID || member.EstablishmentID != "e1") {
				t.Fatalf("stand-in = %+v", member)
			}
		})
	}
}

func TestEstablishmentMemberList(t *testing.T) {
	f := newMemberFixture()
	f.repo.rows[2].removed = true

	members, err := f.service.List(context.Background(), "e1")
	if err != nil || len(members) != 2 || members[0].ID != "m-olga" || members[1].ID != "m-marta" {
		t.Fatalf("members = %+v, %v", members, err)
	}

	empty, err := f.service.List(context.Background(), "e2")
	if err != nil || empty == nil || len(empty) != 0 {
		t.Fatalf("an establishment without members = %#v, %v", empty, err)
	}
}

func TestEstablishmentMemberInvite(t *testing.T) {
	tests := []struct {
		name    string
		inviter domain.User
		email   string
		role    *domain.EstablishmentRole
		code    string
	}{
		{"a manager invites somebody to the staff", memberCaller("marta", domain.RoleUser), "ana@example.com", roleOf(domain.EstablishmentRoleStaff), ""},
		{"a manager invites without a role", memberCaller("marta", domain.RoleUser), "ana@example.com", nil, ""},
		{"a manager invites another manager", memberCaller("marta", domain.RoleUser), "ana@example.com", roleOf(domain.EstablishmentRoleManager), ""},
		{"a manager cannot make an owner", memberCaller("marta", domain.RoleUser), "ana@example.com", roleOf(domain.EstablishmentRoleOwner), domain.CodeCannotGrantOwnerRole},
		{"an inactive owner cannot make an owner", memberCaller("sleeping", domain.RoleUser), "ana@example.com", roleOf(domain.EstablishmentRoleOwner), domain.CodeCannotGrantOwnerRole},
		{"an owner makes another owner", memberCaller("olga", domain.RoleUser), "ana@example.com", roleOf(domain.EstablishmentRoleOwner), ""},
		{"a platform admin makes an owner", memberCaller("admin", domain.RoleAdmin), "ana@example.com", roleOf(domain.EstablishmentRoleOwner), ""},
		{"somebody who is already a member", memberCaller("olga", domain.RoleUser), "sergio@example.com", roleOf(domain.EstablishmentRoleStaff), domain.CodeUserAlreadyMember},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()

			err := f.service.Invite(context.Background(), "e1", tt.inviter, tt.email, tt.role)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.invitations) != 0 || len(f.events.events) != 0 {
					t.Fatalf("err = %v, invitations = %+v, events = %+v; want %s and nothing saved", err, f.repo.invitations, f.events.events, tt.code)
				}
				return
			}
			if err != nil || len(f.repo.invitations) != 1 {
				t.Fatalf("err = %v, invitations = %+v", err, f.repo.invitations)
			}

			invitation := f.repo.invitations[0]
			if invitation.EstablishmentID != "e1" || invitation.Email != tt.email || invitation.UserName != "ana" || !reflect.DeepEqual(invitation.Role, tt.role) {
				t.Fatalf("invitation = %+v", invitation)
			}

			want := domain.MemberInvited{
				EstablishmentID:   "e1",
				MemberID:          "member-ana@example.com",
				Email:             "ana@example.com",
				EstablishmentName: "Bar Pepe",
				InviterName:       "ana",
				InviterLanguage:   "en",
				UserID:            "user-ana@example.com",
			}
			if len(f.events.events) != 1 || f.events.events[0] != want {
				t.Fatalf("events = %+v\nwant %+v", f.events.events, want)
			}
		})
	}
}

func TestEstablishmentMemberInviteBringsBackARemovedMember(t *testing.T) {
	f := newMemberFixture()
	f.repo.rows[2].removed = true

	err := f.service.Invite(context.Background(), "e1", memberCaller("olga", domain.RoleUser), "sergio@example.com", nil)
	if err != nil || len(f.repo.invitations) != 1 {
		t.Fatalf("err = %v, invitations = %+v", err, f.repo.invitations)
	}
}

func TestEstablishmentMemberInviteFailingToSave(t *testing.T) {
	f := newMemberFixture()
	f.repo.fail = true

	err := f.service.Invite(context.Background(), "e1", memberCaller("olga", domain.RoleUser), "ana@example.com", nil)
	if err != errDatabaseDown || len(f.events.events) != 0 {
		t.Fatalf("err = %v, events = %+v", err, f.events.events)
	}
}

func TestEstablishmentMemberResendInvite(t *testing.T) {
	tests := []struct {
		name       string
		memberID   string
		mailerDown bool
		code       string
	}{
		{"sends a fresh invitation", "m-ana", false, ""},
		{"the member does not exist", "missing", false, domain.CodeMemberNotFound},
		{"the user was deactivated", "m-blocked", false, domain.CodeMemberNotFound},
		{"the invitation was already accepted", "m-joined", false, domain.CodeInviteAlreadyAccepted},
		{"the email does not leave", "m-ana", true, domain.CodeInviteEmailFailed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()
			f.repo.invites["m-ana"] = &domain.MemberInvite{ID: "m-ana", UserID: "ana", UserEmail: "ana@example.com", UserActive: true, Pending: true, EstablishmentName: "Bar Pepe"}
			f.repo.invites["m-blocked"] = &domain.MemberInvite{ID: "m-blocked", UserID: "blocked", UserEmail: "blocked@example.com", UserActive: false, Pending: true, EstablishmentName: "Bar Pepe"}
			f.repo.invites["m-joined"] = &domain.MemberInvite{ID: "m-joined", UserID: "joined", UserEmail: "joined@example.com", UserActive: true, Pending: false, EstablishmentName: "Bar Pepe"}
			f.mailer.fail = tt.mailerDown

			err := f.service.ResendInvite(context.Background(), "e1", tt.memberID, memberCaller("marta", domain.RoleUser))

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.mailer.invites) != 0 {
					t.Fatalf("err = %v, emails = %+v; want %s", err, f.mailer.invites, tt.code)
				}
				return
			}

			want := memberInviteEmail{
				to:       "ana@example.com",
				invite:   domain.InviteEmail{EstablishmentName: "Bar Pepe", InviterName: "Caller marta", Token: "token-ana"},
				language: "en",
			}
			if err != nil || len(f.mailer.invites) != 1 || f.mailer.invites[0] != want {
				t.Fatalf("err = %v, emails = %+v", err, f.mailer.invites)
			}
			if !reflect.DeepEqual(f.tokens.issuedFor, []string{"ana/INVITE"}) {
				t.Fatalf("tokens = %v", f.tokens.issuedFor)
			}
		})
	}
}

func TestEstablishmentMemberUpdateRole(t *testing.T) {
	tests := []struct {
		name        string
		memberID    string
		role        domain.EstablishmentRole
		extraOwner  bool
		code        string
		wantChanged bool
	}{
		{"promotes a member", "m-sergio", domain.EstablishmentRoleManager, false, "", true},
		{"the same role changes nothing", "m-sergio", domain.EstablishmentRoleStaff, false, "", false},
		{"the member does not exist", "missing", domain.EstablishmentRoleManager, false, domain.CodeMemberNotFound, false},
		{"the last owner cannot step down", "m-olga", domain.EstablishmentRoleStaff, false, domain.CodeCannotRemoveLastOwner, false},
		{"an owner steps down when there is another", "m-olga", domain.EstablishmentRoleStaff, true, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()
			if tt.extraOwner {
				f.repo.add(domain.EstablishmentMember{ID: "m-luis", UserID: "luis", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner})
			}
			actor := memberCaller("olga", domain.RoleUser)

			err := f.service.UpdateRole(context.Background(), "e1", tt.memberID, tt.role, actor)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.updatedRoles) != 0 || len(f.events.events) != 0 {
					t.Fatalf("err = %v, updated = %v, events = %+v; want %s", err, f.repo.updatedRoles, f.events.events, tt.code)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if !tt.wantChanged {
				if len(f.repo.updatedRoles) != 0 || len(f.events.events) != 0 {
					t.Fatalf("updated = %v, events = %+v; want nothing", f.repo.updatedRoles, f.events.events)
				}
				return
			}

			want := domain.MemberRoleChanged{
				EstablishmentID: "e1",
				MemberID:        tt.memberID,
				UserID:          map[string]string{"m-sergio": "sergio", "m-olga": "olga"}[tt.memberID],
				From:            map[string]domain.EstablishmentRole{"m-sergio": domain.EstablishmentRoleStaff, "m-olga": domain.EstablishmentRoleOwner}[tt.memberID],
				To:              tt.role,
				ActorID:         "olga",
				ActorRole:       domain.RoleUser,
			}
			if len(f.events.events) != 1 || f.events.events[0] != want {
				t.Fatalf("events = %+v\nwant %+v", f.events.events, want)
			}
		})
	}
}

func TestEstablishmentMemberRemove(t *testing.T) {
	tests := []struct {
		name       string
		memberID   string
		extraOwner bool
		code       string
	}{
		{"removes a member", "m-sergio", false, ""},
		{"the member does not exist", "missing", false, domain.CodeMemberNotFound},
		{"the last owner cannot go", "m-olga", false, domain.CodeCannotRemoveLastOwner},
		{"an owner goes when there is another", "m-olga", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()
			if tt.extraOwner {
				f.repo.add(domain.EstablishmentMember{ID: "m-luis", UserID: "luis", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner})
			}

			err := f.service.Remove(context.Background(), "e1", tt.memberID)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.removedIDs) != 0 || len(f.events.events) != 0 {
					t.Fatalf("err = %v, removed = %v, events = %+v; want %s", err, f.repo.removedIDs, f.events.events, tt.code)
				}
				if err.(*domain.Error).Kind != domain.KindBadRequest {
					t.Fatalf("err = %v, want a bad request as in Nest", err)
				}
				return
			}

			userID := map[string]string{"m-sergio": "sergio", "m-olga": "olga"}[tt.memberID]
			want := domain.MemberRemoved{EstablishmentID: "e1", MemberID: tt.memberID, UserID: userID}
			if err != nil || !reflect.DeepEqual(f.repo.removedIDs, []string{tt.memberID}) || len(f.events.events) != 1 || f.events.events[0] != want {
				t.Fatalf("err = %v, removed = %v, events = %+v", err, f.repo.removedIDs, f.events.events)
			}
		})
	}
}

func TestEstablishmentMemberForgetCache(t *testing.T) {
	events := []struct {
		name  string
		event ports.Event
	}{
		{"invited", domain.MemberInvited{EstablishmentID: "e1", UserID: "ana"}},
		{"removed", domain.MemberRemoved{EstablishmentID: "e1", UserID: "ana"}},
		{"role changed", domain.MemberRoleChanged{EstablishmentID: "e1", UserID: "ana"}},
	}

	for _, tt := range events {
		t.Run(tt.name, func(t *testing.T) {
			f := newMemberFixture()

			f.service.ForgetCache(context.Background(), tt.event)

			if !reflect.DeepEqual(f.cache.forgotten, []string{"establishment:e1:member:ana"}) {
				t.Fatalf("forgotten = %v", f.cache.forgotten)
			}
		})
	}
}

func TestEstablishmentMemberSendInvitation(t *testing.T) {
	invited := domain.MemberInvited{
		EstablishmentID:   "e1",
		MemberID:          "m-ana",
		Email:             "ana@example.com",
		EstablishmentName: "Bar Pepe",
		InviterName:       "ana",
		InviterLanguage:   "en",
		UserID:            "ana",
	}

	f := newMemberFixture()
	f.service.SendInvitation(context.Background(), invited)

	want := memberInviteEmail{
		to:       "ana@example.com",
		invite:   domain.InviteEmail{EstablishmentName: "Bar Pepe", InviterName: "ana", Token: "token-ana"},
		language: "en",
	}
	if len(f.mailer.invites) != 1 || f.mailer.invites[0] != want || !reflect.DeepEqual(f.tokens.issuedFor, []string{"ana/INVITE"}) {
		t.Fatalf("emails = %+v, tokens = %v", f.mailer.invites, f.tokens.issuedFor)
	}

	failing := newMemberFixture()
	failing.tokens.fail = true
	failing.service.SendInvitation(context.Background(), invited)
	if len(failing.mailer.invites) != 0 {
		t.Fatalf("without a token it still sent %+v", failing.mailer.invites)
	}

	down := newMemberFixture()
	down.mailer.fail = true
	down.service.SendInvitation(context.Background(), invited)
}

func TestEstablishmentMemberPublishRealtime(t *testing.T) {
	f := newMemberFixture()
	ctx := context.Background()

	f.service.PublishRealtime(ctx, domain.MemberInvited{EstablishmentID: "e1", MemberID: "m-ana", UserID: "ana"})
	f.service.PublishRealtime(ctx, domain.MemberRemoved{EstablishmentID: "e1", MemberID: "m-sergio", UserID: "sergio"})
	f.service.PublishRealtime(ctx, domain.MemberRoleChanged{EstablishmentID: "e1", MemberID: "m-marta", UserID: "marta", From: domain.EstablishmentRoleManager, To: domain.EstablishmentRoleOwner})

	want := []memberRealtimeMessage{
		{establishmentID: "e1", event: domain.RealtimeMemberInvited, payload: memberIDPayload{ID: "m-ana"}},
		{establishmentID: "e1", event: domain.RealtimeMemberRemoved, payload: memberIDPayload{ID: "m-sergio"}},
		{establishmentID: "e1", revokedUserID: "sergio"},
		{establishmentID: "e1", event: domain.RealtimeMemberRoleChanged, payload: memberRoleChangedPayload{ID: "m-marta", UserID: "marta", Role: domain.EstablishmentRoleOwner}},
	}
	if !reflect.DeepEqual(f.realtime.messages, want) {
		t.Fatalf("messages = %+v\nwant %+v", f.realtime.messages, want)
	}
}

func TestEstablishmentMemberAuditRoleChange(t *testing.T) {
	changed := domain.MemberRoleChanged{
		EstablishmentID: "e1",
		MemberID:        "m-sergio",
		UserID:          "sergio",
		From:            domain.EstablishmentRoleStaff,
		To:              domain.EstablishmentRoleManager,
		ActorID:         "admin",
		ActorRole:       domain.RoleAdmin,
	}

	t.Run("a platform admin changed it", func(t *testing.T) {
		f := newMemberFixture()
		f.service.AuditRoleChange(context.Background(), changed)

		name := "Bar Pepe"
		want := domain.AdminAction{Entry: domain.AdminAuditEntry{
			ActorID:     "admin",
			Action:      domain.AuditEstablishmentMemberRoleChanged,
			TargetType:  domain.AuditTargetEstablishment,
			TargetID:    "e1",
			TargetLabel: &name,
			Metadata:    domain.MemberRoleChangedAudit{MemberID: "m-sergio", UserID: "sergio", From: domain.EstablishmentRoleStaff, To: domain.EstablishmentRoleManager},
		}}
		if len(f.events.events) != 1 || !reflect.DeepEqual(f.events.events[0], want) {
			t.Fatalf("events = %+v\nwant %+v", f.events.events, want)
		}
	})

	t.Run("the establishment is gone", func(t *testing.T) {
		f := newMemberFixture()
		gone := changed
		gone.EstablishmentID = "e9"
		f.service.AuditRoleChange(context.Background(), gone)

		action, ok := f.events.events[0].(domain.AdminAction)
		if !ok || action.Entry.TargetLabel != nil || action.Entry.TargetID != "e9" {
			t.Fatalf("events = %+v", f.events.events)
		}
	})

	t.Run("an owner changed it", func(t *testing.T) {
		f := newMemberFixture()
		byOwner := changed
		byOwner.ActorRole = domain.RoleUser
		f.service.AuditRoleChange(context.Background(), byOwner)

		if len(f.events.events) != 0 {
			t.Fatalf("events = %+v, want none", f.events.events)
		}
	})

	t.Run("the database is down", func(t *testing.T) {
		f := newMemberFixture()
		f.repo.fail = true
		f.service.AuditRoleChange(context.Background(), changed)

		if len(f.events.events) != 0 {
			t.Fatalf("events = %+v, want none", f.events.events)
		}
	})
}
