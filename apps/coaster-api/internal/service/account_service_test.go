package service

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

type accountFixture struct {
	service    *AccountService
	users      *fakeUsers
	sessions   *fakeSessions
	identities *fakeIdentities
	tokens     *fakeTokens
	events     *fakePublisher
	mailer     *fakeMailer
	cache      *fakeCache
}

func newAccountFixture(users ...domain.AuthUser) *accountFixture {
	f := &accountFixture{
		users:    newFakeUsers(users...),
		sessions: &fakeSessions{},
		events:   &fakePublisher{},
		mailer:   &fakeMailer{},
		cache:    newFakeCache(),
	}
	f.identities = newFakeIdentities(f.users)
	f.tokens = &fakeTokens{users: f.users}

	f.service = NewAccountService(AccountDependencies{
		Users:      f.users,
		Identities: f.identities,
		Tokens:     f.tokens,
		Sessions:   f.sessions,
		Pwned:      &fakePwned{leaked: []string{"password123"}},
		Mailer:     f.mailer,
		Events:     f.events,
		Cache:      f.cache,
	})

	return f
}

func TestAccountSummary(t *testing.T) {
	ctx := context.Background()
	f := newAccountFixture(userWithPassword(t, "u1", "cuenta@coaster.test", "la-de-siempre"))
	f.identities.Link(ctx, "u1", domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "s", Email: "cuenta@coaster.test"})

	summary, err := f.service.Account(ctx, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if !summary.EmailVerified || !summary.HasPassword || len(summary.Identities) != 1 || summary.Identities[0].Provider != domain.AuthProviderGoogle {
		t.Errorf("summary = %+v", summary)
	}

	_, err = f.service.Account(ctx, "nobody")
	assertCode(t, err, domain.CodeUserNotFound)
}

func TestRequestEmailVerification(t *testing.T) {
	ctx := context.Background()
	verified := userWithPassword(t, "u1", "done@coaster.test", "x-x-x-x-x")
	unverified := domain.AuthUser{ID: "u2", Email: "pending@coaster.test", Active: true}
	f := newAccountFixture(verified, unverified)

	if err := f.service.RequestEmailVerification(ctx, "u1"); err != nil || len(f.mailer.sent) != 0 {
		t.Errorf("a verified address got an email: %v, %v", err, f.mailer.sent)
	}

	if err := f.service.RequestEmailVerification(ctx, "u2"); err != nil {
		t.Fatal(err)
	}
	if sent := f.mailer.lastOf("verifyEmail"); sent == nil || sent.to != "pending@coaster.test" {
		t.Errorf("sent = %+v", sent)
	}

	assertCode(t, f.service.RequestEmailVerification(ctx, "nobody"), domain.CodeUserNotFound)
}

func TestSetPassword(t *testing.T) {
	ctx := context.Background()
	const current = "la-de-siempre"

	tests := []struct {
		name            string
		hasPassword     bool
		currentPassword string
		password        string
		wantCode        string
	}{
		{name: "first password with only Google", password: "una-nueva-buena"},
		{name: "change without the current one", hasPassword: true, password: "una-nueva-buena", wantCode: domain.CodePasswordAlreadySet},
		{name: "change with the wrong current one", hasPassword: true, currentPassword: "la-equivocada", password: "una-nueva-buena", wantCode: domain.CodeInvalidCredentials},
		{name: "change with the right current one", hasPassword: true, currentPassword: current, password: "una-nueva-buena"},
		{name: "leaked new password", hasPassword: true, currentPassword: current, password: "password123", wantCode: domain.CodePasswordCompromised},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := domain.AuthUser{ID: "u1", Email: "cuenta@coaster.test", Active: true}
			if tt.hasPassword {
				user = userWithPassword(t, "u1", "cuenta@coaster.test", current)
			}
			f := newAccountFixture(user)
			mine := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "this-device"})
			other := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "otra-sesion"})

			err := f.service.SetPassword(ctx, domain.SetPasswordInput{UserID: "u1", SessionID: mine.ID, Password: tt.password, CurrentPassword: tt.currentPassword}, origin)

			if tt.wantCode != "" {
				assertCode(t, err, tt.wantCode)
				if f.sessions.revoked(other.ID) {
					t.Error("a refused change closed the other sessions")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			stored := f.users.byID["u1"]
			if !VerifyPassword(*stored.PasswordHash, tt.password) {
				t.Error("the new password was not stored")
			}
			if !f.sessions.revoked(other.ID) || f.sessions.revoked(mine.ID) {
				t.Error("expected every other session closed and this one open")
			}
			if f.mailer.lastOf("passwordChanged") == nil {
				t.Error("nobody was warned")
			}
			changed := f.events.ofType(domain.AuthEventPasswordChanged)
			if len(changed) != 1 || changed[0].Metadata["first"] != !tt.hasPassword {
				t.Errorf("PASSWORD_CHANGED = %+v", changed)
			}
		})
	}
}

func TestSessions(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	macintosh := "Mozilla/5.0 (Macintosh)"
	ip := "10.0.0.1"

	t.Run("one entry per device, the one asking flagged", func(t *testing.T) {
		f := newAccountFixture()
		f.sessions.add(domain.AuthSession{ID: "current", UserID: "u1", FamilyID: "this-device", UserAgent: &macintosh, IP: &ip, LastUsedAt: now})
		f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "the-tablet", LastUsedAt: now.Add(-time.Hour)})

		list, err := f.service.Sessions(ctx, "u1", "current")
		if err != nil {
			t.Fatal(err)
		}
		if len(list) != 2 || list[0].ID != "current" || !list[0].Current || list[1].Current {
			t.Errorf("sessions = %+v", list)
		}
		if *list[0].UserAgent != macintosh || *list[0].IP != ip {
			t.Errorf("origin = %v %v", *list[0].UserAgent, *list[0].IP)
		}
	})

	t.Run("collapses a refresh trail into its live head", func(t *testing.T) {
		f := newAccountFixture()
		f.sessions.add(domain.AuthSession{ID: "old", UserID: "u1", FamilyID: "this-device", RotatedAt: &now, UserAgent: &macintosh, CreatedAt: now.Add(-2 * time.Hour), LastUsedAt: now.Add(-time.Hour)})
		f.sessions.add(domain.AuthSession{ID: "current", UserID: "u1", FamilyID: "this-device", CreatedAt: now.Add(-time.Hour), LastUsedAt: now})

		list, _ := f.service.Sessions(ctx, "u1", "current")

		if len(list) != 1 || list[0].ID != "current" {
			t.Fatalf("sessions = %+v", list)
		}
		if list[0].UserAgent == nil || *list[0].UserAgent != macintosh {
			t.Error("the user agent of the trail was not kept")
		}
		if !list[0].CreatedAt.Equal(now.Add(-2 * time.Hour)) {
			t.Errorf("createdAt = %v, want the oldest", list[0].CreatedAt)
		}
	})

	t.Run("leaves out closed and expired sessions", func(t *testing.T) {
		f := newAccountFixture()
		f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "closed", RevokedAt: &now})
		f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "expired", ExpiresAt: now.Add(-time.Minute)})

		list, _ := f.service.Sessions(ctx, "u1", "")
		if len(list) != 0 {
			t.Errorf("sessions = %+v", list)
		}
	})
}

func TestCloseSession(t *testing.T) {
	ctx := context.Background()

	t.Run("closes the whole family of another device", func(t *testing.T) {
		f := newAccountFixture()
		current := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "this-device"})
		tablet := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "the-tablet"})
		trail := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "the-tablet"})

		if err := f.service.CloseSession(ctx, "u1", tablet.ID, current.ID); err != nil {
			t.Fatal(err)
		}
		if !f.sessions.revoked(tablet.ID) || !f.sessions.revoked(trail.ID) || f.sessions.revoked(current.ID) {
			t.Error("closed the wrong sessions")
		}
	})

	t.Run("refuses to close the session making the call", func(t *testing.T) {
		f := newAccountFixture()
		current := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "this-device"})

		assertCode(t, f.service.CloseSession(ctx, "u1", current.ID, current.ID), domain.CodeCannotCloseCurrentSession)
	})

	t.Run("does not close somebody else's session", func(t *testing.T) {
		f := newAccountFixture()
		theirs := f.sessions.add(domain.AuthSession{UserID: "u2", FamilyID: "theirs"})

		assertCode(t, f.service.CloseSession(ctx, "u1", theirs.ID, ""), domain.CodeSessionNotFound)
		if f.sessions.revoked(theirs.ID) {
			t.Error("closed somebody else's session")
		}
	})
}

func TestCloseOtherSessions(t *testing.T) {
	ctx := context.Background()

	t.Run("keeps this device", func(t *testing.T) {
		f := newAccountFixture()
		trail := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "this-device"})
		current := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "this-device"})
		tablet := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "the-tablet"})

		if err := f.service.CloseOtherSessions(ctx, "u1", current.ID); err != nil {
			t.Fatal(err)
		}
		if f.sessions.revoked(trail.ID) || f.sessions.revoked(current.ID) || !f.sessions.revoked(tablet.ID) {
			t.Error("closed the wrong sessions")
		}
	})

	t.Run("closes everything without a current session", func(t *testing.T) {
		f := newAccountFixture()
		one := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "a"})

		f.service.CloseOtherSessions(ctx, "u1", "")
		if !f.sessions.revoked(one.ID) {
			t.Error("a session survived")
		}
	})
}

func TestUnlinkIdentity(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name        string
		hasPassword bool
		linked      bool
		wantCode    string
	}{
		{name: "a password is left", hasPassword: true, linked: true},
		{name: "the last way in", linked: true, wantCode: domain.CodeLastWayIn},
		{name: "never linked", hasPassword: true, wantCode: domain.CodeIdentityNotLinked},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := domain.AuthUser{ID: "u1", Email: "cuenta@coaster.test", Active: true}
			if tt.hasPassword {
				hash := "$argon2id$..."
				user.PasswordHash = &hash
			}
			f := newAccountFixture(user)
			if tt.linked {
				f.identities.Link(ctx, "u1", domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "s"})
			}

			err := f.service.UnlinkIdentity(ctx, "u1", domain.AuthProviderGoogle, origin)

			if tt.wantCode != "" {
				assertCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(f.identities.rows["u1"]) != 0 {
				t.Error("Google is still linked")
			}
			if len(f.events.ofType(domain.AuthEventIdentityUnlinked)) != 1 {
				t.Error("IDENTITY_UNLINKED was not published")
			}
		})
	}
}
