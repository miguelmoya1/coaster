package repository

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

func createTestUser(t *testing.T, email string) *domain.AuthUser {
	t.Helper()

	hash := "hash"
	user, err := NewAuthUserRepository(testPool).Create(context.Background(), domain.NewUser{
		Email:        email,
		Name:         "Ana",
		PasswordHash: &hash,
	})
	if err != nil {
		t.Fatalf("creating user: %v", err)
	}
	return user
}

func TestAuthUserRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewAuthUserRepository(testPool)

	english := "en"
	created, err := users.Create(ctx, domain.NewUser{
		Email:    "ana@example.com",
		Name:     "Ana",
		Language: &english,
		Identity: &domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-1", Email: "ana@example.com"},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.Role != domain.RoleUser || !created.Active || created.PasswordHash != nil || created.Language == nil || *created.Language != "en" {
		t.Fatalf("created user = %+v", created)
	}

	found, err := users.FindByEmail(ctx, "  ANA@example.com ")
	if err != nil || found == nil || found.ID != created.ID {
		t.Fatalf("FindByEmail = %+v, %v", found, err)
	}

	missing, err := users.FindByID(ctx, "nobody")
	if err != nil || missing != nil {
		t.Fatalf("FindByID(nobody) = %+v, %v", missing, err)
	}

	if err := users.SetPassword(ctx, created.ID, "new-hash", true); err != nil {
		t.Fatalf("SetPassword: %v", err)
	}
	found, _ = users.FindByID(ctx, created.ID)
	if found.PasswordHash == nil || *found.PasswordHash != "new-hash" || found.EmailVerifiedAt == nil {
		t.Fatalf("after SetPassword = %+v", found)
	}

	photo := "https://example.com/ana.png"
	if err := users.ClaimForGoogle(ctx, created.ID, true, &photo); err != nil {
		t.Fatalf("ClaimForGoogle: %v", err)
	}
	found, _ = users.FindByID(ctx, created.ID)
	if found.PasswordHash != nil || found.PhotoURL == nil || *found.PhotoURL != photo {
		t.Fatalf("after ClaimForGoogle = %+v", found)
	}

	if _, err := testPool.Exec(ctx, `INSERT INTO "BetaTester" (id, email) VALUES ('b1', 'beta@example.com')`); err != nil {
		t.Fatal(err)
	}
	for email, want := range map[string]bool{"beta@example.com": true, "ana@example.com": false} {
		got, err := users.IsBetaTester(ctx, email)
		if err != nil || got != want {
			t.Errorf("IsBetaTester(%s) = %v, %v; want %v", email, got, err, want)
		}
	}

	identities := NewAuthIdentityRepository(testPool)
	byGoogle, err := identities.FindUserBySubject(ctx, domain.AuthProviderGoogle, "sub-1")
	if err != nil || byGoogle == nil || byGoogle.ID != created.ID {
		t.Fatalf("FindUserBySubject = %+v, %v", byGoogle, err)
	}
	if err := identities.Touch(ctx, domain.AuthProviderGoogle, "sub-1"); err != nil {
		t.Fatalf("Touch: %v", err)
	}
	if err := identities.Link(ctx, created.ID, domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-2", Email: "x@example.com"}); err != nil {
		t.Fatalf("Link: %v", err)
	}
	list, err := identities.ListOf(ctx, created.ID)
	if err != nil || len(list) != 1 || list[0].Subject != "sub-2" {
		t.Fatalf("ListOf = %+v, %v", list, err)
	}
	if err := identities.Delete(ctx, created.ID, domain.AuthProviderGoogle); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	list, _ = identities.ListOf(ctx, created.ID)
	if len(list) != 0 {
		t.Fatalf("ListOf after Delete = %+v", list)
	}
}

func TestAuthTokenRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	tokens := NewAuthTokenRepository(testPool)

	first, err := tokens.Issue(ctx, user.ID, domain.AuthTokenPasswordReset)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	second, err := tokens.Issue(ctx, user.ID, domain.AuthTokenPasswordReset)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	if stored, _ := tokens.FindUsable(ctx, first, domain.AuthTokenPasswordReset); stored != nil {
		t.Fatalf("a new token must burn the older one")
	}
	if stored, _ := tokens.FindUsable(ctx, second, domain.AuthTokenInvite); stored != nil {
		t.Fatalf("a token must not work for another purpose")
	}

	stored, err := tokens.FindUsable(ctx, second, domain.AuthTokenPasswordReset)
	if err != nil || stored == nil || stored.User.ID != user.ID {
		t.Fatalf("FindUsable = %+v, %v", stored, err)
	}

	spent, err := tokens.Spend(ctx, stored.ID)
	if err != nil || !spent {
		t.Fatalf("Spend = %v, %v", spent, err)
	}
	spent, err = tokens.Spend(ctx, stored.ID)
	if err != nil || spent {
		t.Fatalf("second Spend = %v, %v; want false", spent, err)
	}
}

func TestAuthSessionRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	other := createTestUser(t, "otro@example.com")
	sessions := NewAuthSessionRepository(testPool)

	newSession := func(userID, hash, family string, expiresAt time.Time) *domain.AuthSession {
		t.Helper()
		session, err := sessions.Create(ctx, domain.NewAuthSession{
			UserID: userID, TokenHash: hash, FamilyID: family, ExpiresAt: expiresAt,
			Origin: domain.SessionOrigin{UserAgent: "Firefox", IP: "1.2.3.4"},
		})
		if err != nil {
			t.Fatalf("Create: %v", err)
		}
		return session
	}

	later := time.Now().Add(time.Hour)
	first := newSession(user.ID, "h1", "f1", later)
	newSession(user.ID, "old", "f0", time.Now().Add(-time.Hour))
	newSession(other.ID, "h9", "f9", later)

	found, err := sessions.FindByTokenHash(ctx, "h1")
	if err != nil || found == nil || found.ID != first.ID || found.IP == nil || *found.IP != "1.2.3.4" {
		t.Fatalf("FindByTokenHash = %+v, %v", found, err)
	}

	rotated, err := sessions.Rotate(ctx, first.ID, domain.NewAuthSession{UserID: user.ID, TokenHash: "h2", FamilyID: "f1", ExpiresAt: later})
	if err != nil {
		t.Fatalf("Rotate: %v", err)
	}
	found, _ = sessions.FindByTokenHash(ctx, "h1")
	if found.RotatedAt == nil {
		t.Fatalf("the rotated session must have rotatedAt")
	}

	live, err := sessions.ListLiveOf(ctx, user.ID)

	if err != nil || len(live) != 2 || live[0].ID != rotated.ID {
		t.Fatalf("ListLiveOf = %+v, %v", live, err)
	}

	if owned, _ := sessions.FindOwnedBy(ctx, rotated.ID, other.ID); owned != nil {
		t.Fatalf("FindOwnedBy must not find another user's session")
	}

	if err := sessions.DeleteExpiredOf(ctx, user.ID); err != nil {
		t.Fatalf("DeleteExpiredOf: %v", err)
	}
	if expired, _ := sessions.FindByTokenHash(ctx, "old"); expired != nil {
		t.Fatalf("DeleteExpiredOf must delete the expired session")
	}

	third := newSession(user.ID, "h3", "f3", later)
	if err := sessions.RevokeEveryOtherFamilyOf(ctx, user.ID, "f3"); err != nil {
		t.Fatalf("RevokeEveryOtherFamilyOf: %v", err)
	}
	live, _ = sessions.ListLiveOf(ctx, user.ID)
	if len(live) != 1 || live[0].ID != third.ID {
		t.Fatalf("after RevokeEveryOtherFamilyOf = %+v", live)
	}

	if err := sessions.RevokeFamily(ctx, "f3"); err != nil {
		t.Fatalf("RevokeFamily: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 0 {
		t.Fatalf("after RevokeFamily = %+v", live)
	}

	a := newSession(user.ID, "a", "fa", later)
	newSession(user.ID, "b", "fb", later)
	if err := sessions.RevokeEveryOtherSessionOf(ctx, user.ID, a.ID); err != nil {
		t.Fatalf("RevokeEveryOtherSessionOf: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 1 || live[0].ID != a.ID {
		t.Fatalf("after RevokeEveryOtherSessionOf = %+v", live)
	}

	if err := sessions.RevokeEverySessionOf(ctx, user.ID); err != nil {
		t.Fatalf("RevokeEverySessionOf: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 0 {
		t.Fatalf("after RevokeEverySessionOf = %+v", live)
	}
	if live, _ = sessions.ListLiveOf(ctx, other.ID); len(live) != 1 {
		t.Fatalf("the other user's session must stay live")
	}
}

func TestAuthEventRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	events := NewAuthEventRepository(testPool)

	err := events.Record(ctx, domain.AuthEventOccurred{
		Type:     domain.AuthEventLoginSucceeded,
		UserID:   user.ID,
		Email:    " ANA@example.com",
		Origin:   domain.SessionOrigin{IP: "1.2.3.4"},
		Metadata: map[string]any{"method": "password"},
	})
	if err != nil {
		t.Fatalf("Record: %v", err)
	}
	if err := events.Record(ctx, domain.AuthEventOccurred{Type: domain.AuthEventLoginFailed, Email: "nadie@example.com"}); err != nil {
		t.Fatalf("Record without user: %v", err)
	}

	recent, err := events.FindRecentOf(ctx, user.ID, 10)
	if err != nil || len(recent) != 1 {
		t.Fatalf("FindRecentOf = %+v, %v", recent, err)
	}
	got := recent[0]
	if got.Email == nil || *got.Email != "ana@example.com" || got.UserAgent != nil || got.Metadata["method"] != "password" {
		t.Fatalf("recorded event = %+v", got)
	}
}

func TestSecurityRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	security := NewSecurityRepository(testPool)

	statements := []string{
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar', now()), ('e2', 'Otro', now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt") VALUES ('m1', '` + user.ID + `', 'e1', 'MANAGER', true, now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt", "deletedAt") VALUES ('m2', '` + user.ID + `', 'e2', 'OWNER', true, now(), now())`,
		`INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, "updatedAt") VALUES ('s1', 'e1', ARRAY['ORDERS']::"EstablishmentModule"[], now())`,
		`INSERT INTO "EstablishmentSubscription" (id, "establishmentId", status, "manualPlan", "trialEndsAt", "updatedAt") VALUES ('b1', 'e1', 'TRIALING', 'PRO', '2030-01-02 03:04:05.678', now())`,
	}
	for _, statement := range statements {
		if _, err := testPool.Exec(ctx, statement); err != nil {
			t.Fatalf("%s: %v", statement, err)
		}
	}

	role, err := security.UserRole(ctx, user.ID)
	if err != nil || role != domain.RoleUser {
		t.Fatalf("UserRole = %q, %v", role, err)
	}
	if role, _ := security.UserRole(ctx, "nobody"); role != "" {
		t.Fatalf("UserRole(nobody) = %q", role)
	}

	membership, err := security.Membership(ctx, user.ID, "e1")
	if err != nil || membership == nil || membership.Role != string(domain.EstablishmentRoleManager) || !membership.Active {
		t.Fatalf("Membership = %+v, %v", membership, err)
	}
	if deleted, _ := security.Membership(ctx, user.ID, "e2"); deleted != nil {
		t.Fatalf("a deleted membership must not count")
	}

	modules, found, err := security.EnabledModules(ctx, "e1")
	if err != nil || !found || len(modules) != 1 || modules[0] != domain.ModuleOrders {
		t.Fatalf("EnabledModules = %v, %v, %v", modules, found, err)
	}
	if _, found, _ := security.EnabledModules(ctx, "e2"); found {
		t.Fatalf("EnabledModules(e2) must not be found")
	}

	state, err := security.SubscriptionState(ctx, "e1")
	if err != nil || state == nil || state.Status != domain.SubscriptionTrialing || state.ManualPlan == nil || *state.ManualPlan != domain.PlanPro {
		t.Fatalf("SubscriptionState = %+v, %v", state, err)
	}
	if state.TrialEndsAt == nil || state.TrialEndsAt.Time.Format(time.RFC3339Nano) != "2030-01-02T03:04:05.678Z" {
		t.Fatalf("TrialEndsAt = %v", state.TrialEndsAt)
	}
	if state, _ := security.SubscriptionState(ctx, "e2"); state != nil {
		t.Fatalf("SubscriptionState(e2) = %+v", state)
	}
}
