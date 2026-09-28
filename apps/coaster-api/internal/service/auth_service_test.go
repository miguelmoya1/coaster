package service

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

type authFixture struct {
	service    *AuthService
	users      *fakeUsers
	sessions   *fakeSessions
	tokens     *fakeTokens
	identities *fakeIdentities
	events     *fakePublisher
	mailer     *fakeMailer
	google     *fakeGoogle
	pwned      *fakePwned
	attempts   *fakeAttempts
	cache      *fakeCache
}

func newAuthFixture(users ...domain.AuthUser) *authFixture {
	f := &authFixture{
		users:    newFakeUsers(users...),
		sessions: &fakeSessions{},
		events:   &fakePublisher{},
		mailer:   &fakeMailer{},
		google:   &fakeGoogle{clientID: "client-id"},
		pwned:    &fakePwned{leaked: []string{"password123"}},
		attempts: &fakeAttempts{},
		cache:    newFakeCache(),
	}
	f.tokens = &fakeTokens{users: f.users}
	f.identities = newFakeIdentities(f.users)

	sessionService := NewSessionService(f.sessions, newTestTokens(f.users, f.cache), f.events)

	f.service = NewAuthService(AuthDependencies{
		Users:       f.users,
		Identities:  f.identities,
		Tokens:      f.tokens,
		SessionRepo: f.sessions,
		Sessions:    sessionService,
		Google:      f.google,
		Pwned:       f.pwned,
		Attempts:    f.attempts,
		Mailer:      f.mailer,
		Events:      f.events,
		Cache:       f.cache,
	})

	return f
}

func assertCode(t *testing.T, err error, code string) {
	t.Helper()
	if !domain.HasCode(err, code) {
		t.Fatalf("err = %v, want %s", err, code)
	}
}

func userWithPassword(t *testing.T, id, email, password string) domain.AuthUser {
	t.Helper()
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	verified := time.Now()
	return domain.AuthUser{ID: id, Email: email, Name: "Ana", PasswordHash: &hash, EmailVerifiedAt: &verified, Active: true, Role: domain.RoleUser}
}

var origin = domain.SessionOrigin{UserAgent: "Mozilla/5.0", IP: "10.0.0.1"}

func TestRegister(t *testing.T) {
	ctx := context.Background()

	t.Run("opens the account, hashes the password and signs in", func(t *testing.T) {
		f := newAuthFixture()

		issued, err := f.service.Register(ctx, domain.RegisterInput{Email: "  Nueva@Coaster.TEST ", Password: "a-good-enough-password", Name: " Nueva "}, origin)
		if err != nil {
			t.Fatal(err)
		}

		stored, _ := f.users.FindByEmail(ctx, "nueva@coaster.test")
		if stored == nil || stored.Name != "Nueva" {
			t.Fatalf("stored = %+v", stored)
		}
		if !VerifyPassword(*stored.PasswordHash, "a-good-enough-password") {
			t.Error("the stored hash does not match the password")
		}
		if issued.User.Email != "nueva@coaster.test" || issued.AccessToken == "" {
			t.Errorf("issued = %+v", issued)
		}
		registered := f.events.ofType(domain.AuthEventRegistered)
		if len(registered) != 1 || registered[0].SessionID != issued.SessionID || registered[0].Origin.IP != "10.0.0.1" {
			t.Errorf("REGISTERED = %+v", registered)
		}
	})

	t.Run("refuses an address that has an account", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "nueva@coaster.test", Active: true})

		_, err := f.service.Register(ctx, domain.RegisterInput{Email: "nueva@coaster.test", Password: "a-good-enough-password", Name: "N"}, origin)
		assertCode(t, err, domain.CodeUserAlreadyExists)
	})

	t.Run("refuses a leaked password", func(t *testing.T) {
		f := newAuthFixture()

		_, err := f.service.Register(ctx, domain.RegisterInput{Email: "nueva@coaster.test", Password: "password123", Name: "N"}, origin)
		assertCode(t, err, domain.CodePasswordCompromised)
	})

	t.Run("refuses an address outside the beta while the allowlist is on", func(t *testing.T) {
		f := newAuthFixture()
		f.service.betaAllowlistOn = true

		_, err := f.service.Register(ctx, domain.RegisterInput{Email: "nueva@coaster.test", Password: "a-good-enough-password", Name: "N"}, origin)
		assertCode(t, err, domain.CodeBetaAccessRequired)

		f.users.betaTesters = []string{"nueva@coaster.test"}
		if _, err := f.service.Register(ctx, domain.RegisterInput{Email: "nueva@coaster.test", Password: "a-good-enough-password", Name: "N"}, origin); err != nil {
			t.Errorf("a beta tester was refused: %v", err)
		}
	})
}

func TestLoginWithPassword(t *testing.T) {
	ctx := context.Background()
	const password = "a-good-enough-password"

	t.Run("signs in whatever the casing and forgets the failures", func(t *testing.T) {
		f := newAuthFixture(userWithPassword(t, "u1", "nueva@coaster.test", password))
		f.attempts.Remember(ctx, "nueva@coaster.test")

		issued, err := f.service.LoginWithPassword(ctx, "Nueva@Coaster.TEST", password, origin)
		if err != nil {
			t.Fatal(err)
		}
		if issued.User.ID != "u1" {
			t.Errorf("signed in as %s", issued.User.ID)
		}
		if f.attempts.failures["nueva@coaster.test"] != 0 {
			t.Error("the failures were not forgotten")
		}
		succeeded := f.events.ofType(domain.AuthEventLoginSucceeded)
		if len(succeeded) != 1 || succeeded[0].Metadata["method"] != "password" || succeeded[0].SessionID == "" {
			t.Errorf("LOGIN_SUCCEEDED = %+v", succeeded)
		}
	})

	inactive := userWithPassword(t, "u2", "inactive@coaster.test", password)
	inactive.Active = false
	noPassword := domain.AuthUser{ID: "u3", Email: "google@coaster.test", Active: true}

	tests := []struct {
		name       string
		email      string
		password   string
		wantReason string
		wantUserID string
	}{
		{name: "wrong password", email: "nueva@coaster.test", password: "not-the-password", wantReason: "wrong_password", wantUserID: "u1"},
		{name: "unknown address", email: "nobody@coaster.test", password: password, wantReason: "no_account"},
		{name: "deactivated account", email: "inactive@coaster.test", password: password, wantReason: "inactive", wantUserID: "u2"},
		{name: "account without a password", email: "google@coaster.test", password: password, wantReason: "wrong_password", wantUserID: "u3"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newAuthFixture(userWithPassword(t, "u1", "nueva@coaster.test", password), inactive, noPassword)

			_, err := f.service.LoginWithPassword(ctx, tt.email, tt.password, origin)
			assertCode(t, err, domain.CodeInvalidCredentials)

			if f.attempts.failures[tt.email] != 1 {
				t.Error("the failure was not counted")
			}
			failed := f.events.ofType(domain.AuthEventLoginFailed)
			if len(failed) != 1 || failed[0].Metadata["reason"] != tt.wantReason || failed[0].UserID != tt.wantUserID {
				t.Errorf("LOGIN_FAILED = %+v", failed)
			}
		})
	}

	t.Run("turns a locked address away before looking", func(t *testing.T) {
		f := newAuthFixture(userWithPassword(t, "u1", "nueva@coaster.test", password))
		f.attempts.lockedFor = 90

		_, err := f.service.LoginWithPassword(ctx, "nueva@coaster.test", password, origin)
		assertCode(t, err, domain.CodeTooManyAttempts)

		blocked := f.events.ofType(domain.AuthEventLoginBlocked)
		if len(blocked) != 1 || blocked[0].Metadata["retryAfterSeconds"] != 90 {
			t.Errorf("LOGIN_BLOCKED = %+v", blocked)
		}
	})
}

func TestLoginWithGoogle(t *testing.T) {
	ctx := context.Background()
	picture := "https://google.test/photo.png"
	identity := &domain.GoogleIdentity{Subject: "google-sub", Email: "ana@coaster.test", Name: "Ana", Picture: &picture}

	t.Run("refuses while no client id is configured", func(t *testing.T) {
		f := newAuthFixture()
		f.google.clientID = ""

		_, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		assertCode(t, err, domain.CodeGoogleSignInUnavailable)
	})

	t.Run("refuses a token Google does not vouch for", func(t *testing.T) {
		f := newAuthFixture()

		_, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		assertCode(t, err, domain.CodeInvalidCredentials)

		failed := f.events.ofType(domain.AuthEventLoginFailed)
		if len(failed) != 1 || failed[0].Metadata["reason"] != "google_token_rejected" {
			t.Errorf("LOGIN_FAILED = %+v", failed)
		}
	})

	t.Run("signs in the linked account", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.identities.Link(ctx, "u1", domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "google-sub"})
		f.google.identity = identity

		issued, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		if err != nil {
			t.Fatal(err)
		}
		if issued.User.ID != "u1" || len(f.identities.touched) != 1 {
			t.Errorf("issued = %+v, touched = %v", issued, f.identities.touched)
		}
	})

	t.Run("refuses a linked account that was deactivated", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: false})
		f.identities.Link(ctx, "u1", domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "google-sub"})
		f.google.identity = identity

		_, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		assertCode(t, err, domain.CodeInvalidCredentials)
	})

	t.Run("claims the account with the same address and drops a password nobody proved", func(t *testing.T) {
		hash := "$argon2id$unproved"
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true, PasswordHash: &hash})
		old := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "old"})
		f.google.identity = identity

		issued, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		if err != nil {
			t.Fatal(err)
		}

		claimed := f.users.byID["u1"]
		if claimed.PasswordHash != nil || claimed.EmailVerifiedAt == nil || claimed.PhotoURL == nil {
			t.Errorf("claimed = %+v", claimed)
		}
		if !f.sessions.revoked(old.ID) {
			t.Error("the sessions of the unproved password were left open")
		}
		if len(f.identities.rows["u1"]) != 1 || !issued.User.EmailVerified {
			t.Error("Google was not linked")
		}
		if len(f.events.ofType(domain.AuthEventIdentityLinked)) != 1 {
			t.Error("IDENTITY_LINKED was not published")
		}
	})

	t.Run("keeps a password the owner had proved", func(t *testing.T) {
		f := newAuthFixture(userWithPassword(t, "u1", "ana@coaster.test", "a-good-enough-password"))
		f.google.identity = identity

		if _, err := f.service.LoginWithGoogle(ctx, "credential", origin); err != nil {
			t.Fatal(err)
		}
		if f.users.byID["u1"].PasswordHash == nil {
			t.Error("a proved password was dropped")
		}
	})

	t.Run("opens a new account", func(t *testing.T) {
		f := newAuthFixture()
		f.google.identity = &domain.GoogleIdentity{Subject: "google-sub", Email: "nuevo@coaster.test"}

		issued, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		if err != nil {
			t.Fatal(err)
		}
		if issued.User.Name != "nuevo" || !issued.User.EmailVerified {
			t.Errorf("user = %+v", issued.User)
		}
		for _, eventType := range []domain.AuthEventType{domain.AuthEventRegistered, domain.AuthEventIdentityLinked, domain.AuthEventLoginSucceeded} {
			if len(f.events.ofType(eventType)) != 1 {
				t.Errorf("%s was not published once", eventType)
			}
		}
	})

	t.Run("refuses a new account outside the beta", func(t *testing.T) {
		f := newAuthFixture()
		f.service.betaAllowlistOn = true
		f.google.identity = identity

		_, err := f.service.LoginWithGoogle(ctx, "credential", origin)
		assertCode(t, err, domain.CodeBetaAccessRequired)

		failed := f.events.ofType(domain.AuthEventLoginFailed)
		if len(failed) != 1 || failed[0].Metadata["reason"] != "outside_beta" {
			t.Errorf("LOGIN_FAILED = %+v", failed)
		}
	})
}

func TestRefresh(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	longAgo := now.Add(-time.Minute)
	justNow := now.Add(-5 * time.Second)

	tests := []struct {
		name           string
		token          string
		session        *domain.AuthSession
		userActive     bool
		wantErr        bool
		wantFamilyDrop bool
		wantReuseEvent bool
	}{
		{name: "no cookie", token: "", wantErr: true},
		{name: "a token nobody issued", token: "unknown", wantErr: true},
		{name: "revoked", token: "t", session: &domain.AuthSession{RevokedAt: &now}, userActive: true, wantErr: true},
		{name: "expired", token: "t", session: &domain.AuthSession{ExpiresAt: now.Add(-time.Second)}, userActive: true, wantErr: true},
		{name: "replayed after the grace", token: "t", session: &domain.AuthSession{RotatedAt: &longAgo}, userActive: true, wantErr: true, wantFamilyDrop: true, wantReuseEvent: true},
		{name: "replayed within the grace", token: "t", session: &domain.AuthSession{RotatedAt: &justNow}, userActive: true},
		{name: "deactivated user", token: "t", session: &domain.AuthSession{}, userActive: false, wantErr: true, wantFamilyDrop: true},
		{name: "live session", token: "t", session: &domain.AuthSession{}, userActive: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: tt.userActive})
			if tt.session != nil {
				tt.session.UserID = "u1"
				tt.session.FamilyID = "family-1"
				tt.session.TokenHash = domain.HashRefreshToken(tt.token)
				f.sessions.add(*tt.session)
			}

			issued, err := f.service.Refresh(ctx, tt.token, origin)

			if tt.wantErr {
				assertCode(t, err, domain.CodeSessionExpired)
			} else if err != nil || issued.AccessToken == "" {
				t.Fatalf("Refresh = %+v, %v", issued, err)
			}

			if dropped := len(f.sessions.revokedFamily) > 0; dropped != tt.wantFamilyDrop {
				t.Errorf("family dropped = %v, want %v", dropped, tt.wantFamilyDrop)
			}
			if reused := len(f.events.ofType(domain.AuthEventRefreshReuseDetected)) > 0; reused != tt.wantReuseEvent {
				t.Errorf("reuse event = %v, want %v", reused, tt.wantReuseEvent)
			}
			if !tt.wantErr && f.sessions.rows[len(f.sessions.rows)-1].FamilyID != "family-1" {
				t.Error("the new session left the family")
			}
		})
	}
}

func TestRequestPasswordReset(t *testing.T) {
	ctx := context.Background()
	inactive := domain.AuthUser{ID: "u2", Email: "gone@coaster.test", Active: false}

	tests := []struct {
		name      string
		email     string
		wantEmail bool
	}{
		{name: "an account", email: " Ana@Coaster.test", wantEmail: true},
		{name: "nobody", email: "nobody@coaster.test"},
		{name: "a deactivated account", email: "gone@coaster.test"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true}, inactive)

			if err := f.service.RequestPasswordReset(ctx, tt.email); err != nil {
				t.Fatal(err)
			}

			sent := f.mailer.lastOf("resetPassword")
			if (sent != nil) != tt.wantEmail {
				t.Fatalf("sent = %+v", sent)
			}
			if tt.wantEmail {
				if sent.token != f.tokens.issued[0] {
					t.Error("the email does not carry the issued token")
				}
				if len(f.events.ofType(domain.AuthEventPasswordResetRequested)) != 1 {
					t.Error("PASSWORD_RESET_REQUESTED was not published")
				}
			}
		})
	}
}

func TestResetPassword(t *testing.T) {
	ctx := context.Background()

	t.Run("sets the password, closes every session, warns and signs in", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		old := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "old"})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))

		issued, err := f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin)
		if err != nil {
			t.Fatal(err)
		}

		user := f.users.byID["u1"]
		if user.PasswordHash == nil || !VerifyPassword(*user.PasswordHash, "a-new-good-one") || user.EmailVerifiedAt == nil {
			t.Errorf("user = %+v", user)
		}
		if !f.sessions.revoked(old.ID) {
			t.Error("the old session was left open")
		}
		if f.mailer.lastOf("passwordChanged") == nil {
			t.Error("nobody was warned")
		}
		if issued.AccessToken == "" || len(f.events.ofType(domain.AuthEventPasswordResetCompleted)) != 1 {
			t.Error("did not sign in or publish")
		}
		if len(f.cache.forgotten) == 0 {
			t.Error("the cached user was not forgotten")
		}
	})

	t.Run("still signs in when the warning cannot be sent", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))
		f.mailer.fail = true

		if _, err := f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("refuses a link used twice", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))

		f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin)
		_, err := f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin)
		assertCode(t, err, domain.CodeInvalidToken)
	})

	t.Run("refuses an expired link", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(-time.Second))

		_, err := f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin)
		assertCode(t, err, domain.CodeInvalidToken)
	})

	t.Run("refuses a leaked password before spending the link", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		row := f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))

		_, err := f.service.ResetPassword(ctx, "reset-token", "password123", origin)
		assertCode(t, err, domain.CodePasswordCompromised)
		if row.used {
			t.Error("the link was spent")
		}
	})

	t.Run("refuses a deactivated account", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: false})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))

		_, err := f.service.ResetPassword(ctx, "reset-token", "a-new-good-one", origin)
		assertCode(t, err, domain.CodeInvalidCredentials)
	})
}

func TestPasswordResetSummary(t *testing.T) {
	f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
	f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))
	f.tokens.add("u1", "invite-token", domain.AuthTokenInvite, time.Now().Add(time.Hour))

	summary, err := f.service.PasswordReset(context.Background(), "reset-token")
	if err != nil || summary.Email != "ana@coaster.test" {
		t.Errorf("PasswordReset = %+v, %v", summary, err)
	}

	_, err = f.service.PasswordReset(context.Background(), "invite-token")
	assertCode(t, err, domain.CodeInvalidToken)
}

func TestVerifyEmail(t *testing.T) {
	ctx := context.Background()
	f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
	f.tokens.add("u1", "verify-token", domain.AuthTokenEmailVerification, time.Now().Add(time.Hour))

	if err := f.service.VerifyEmail(ctx, "verify-token"); err != nil {
		t.Fatal(err)
	}
	if f.users.byID["u1"].EmailVerifiedAt == nil {
		t.Error("the address was not confirmed")
	}
	if verified := f.events.ofType(domain.AuthEventEmailVerified); len(verified) != 1 || verified[0].Email != "ana@coaster.test" {
		t.Errorf("EMAIL_VERIFIED = %+v", verified)
	}

	assertCode(t, f.service.VerifyEmail(ctx, "verify-token"), domain.CodeInvalidToken)
}

func TestInvite(t *testing.T) {
	ctx := context.Background()
	hash := "$argon2id$..."

	tests := []struct {
		name            string
		user            domain.AuthUser
		linkGoogle      bool
		wantCredentials bool
	}{
		{name: "nothing to sign in with yet", user: domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Name: "Ana", Active: true}},
		{name: "a password", user: domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Name: "Ana", Active: true, PasswordHash: &hash}, wantCredentials: true},
		{name: "Google", user: domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Name: "Ana", Active: true}, linkGoogle: true, wantCredentials: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newAuthFixture(tt.user)
			f.tokens.add("u1", "invite-token", domain.AuthTokenInvite, time.Now().Add(time.Hour))
			if tt.linkGoogle {
				f.identities.Link(ctx, "u1", domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "s"})
			}

			summary, err := f.service.Invite(ctx, "invite-token")
			if err != nil {
				t.Fatal(err)
			}
			want := domain.InviteSummary{Email: "ana@coaster.test", Name: "Ana", HasCredentials: tt.wantCredentials}
			if summary != want {
				t.Errorf("Invite = %+v, want %+v", summary, want)
			}
		})
	}
}

func TestAcceptInvite(t *testing.T) {
	ctx := context.Background()

	t.Run("sets the password, confirms the address and signs in", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.tokens.add("u1", "invite-token", domain.AuthTokenInvite, time.Now().Add(time.Hour))

		issued, err := f.service.AcceptInvite(ctx, "invite-token", "a-good-enough-password", origin)
		if err != nil {
			t.Fatal(err)
		}
		if !issued.User.EmailVerified || f.users.byID["u1"].PasswordHash == nil {
			t.Errorf("user = %+v", issued.User)
		}
		if len(f.events.ofType(domain.AuthEventInviteAccepted)) != 1 {
			t.Error("INVITE_ACCEPTED was not published")
		}
	})

	t.Run("refuses somebody who already has a password", func(t *testing.T) {
		hash := "$argon2id$..."
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true, PasswordHash: &hash})
		f.tokens.add("u1", "invite-token", domain.AuthTokenInvite, time.Now().Add(time.Hour))

		_, err := f.service.AcceptInvite(ctx, "invite-token", "a-good-enough-password", origin)
		assertCode(t, err, domain.CodePasswordAlreadySet)
	})

	t.Run("refuses a token for something else", func(t *testing.T) {
		f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
		f.tokens.add("u1", "reset-token", domain.AuthTokenPasswordReset, time.Now().Add(time.Hour))

		_, err := f.service.AcceptInvite(ctx, "reset-token", "a-good-enough-password", origin)
		assertCode(t, err, domain.CodeInvalidToken)
	})
}

func TestLogoutEverywhere(t *testing.T) {
	f := newAuthFixture(domain.AuthUser{ID: "u1", Email: "ana@coaster.test", Active: true})
	one := f.sessions.add(domain.AuthSession{UserID: "u1", FamilyID: "a"})

	if err := f.service.LogoutEverywhere(context.Background(), "u1", origin); err != nil {
		t.Fatal(err)
	}
	if !f.sessions.revoked(one.ID) {
		t.Error("a session survived")
	}
}
