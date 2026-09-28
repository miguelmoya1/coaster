package service

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

var testUser = domain.AuthUser{ID: "user-1", Email: "ana@coaster.test", Name: "Ana", Active: true, Role: domain.RoleUser}

func newTestSessionService() (*SessionService, *fakeSessions, *fakePublisher) {
	sessions := &fakeSessions{}
	events := &fakePublisher{}
	return NewSessionService(sessions, newTestTokens(newFakeUsers(), newFakeCache()), events), sessions, events
}

func TestIssueStoresOnlyTheHashOfTheRefreshToken(t *testing.T) {
	service, sessions, _ := newTestSessionService()

	issued, err := service.Issue(context.Background(), testUser, domain.SessionOrigin{})
	if err != nil {
		t.Fatal(err)
	}

	stored := sessions.rows[0]
	if stored.TokenHash == issued.RefreshToken {
		t.Error("the refresh token was stored as it is")
	}
	if stored.TokenHash != domain.HashRefreshToken(issued.RefreshToken) {
		t.Error("the stored hash is not the hash of the token handed out")
	}
}

func TestIssueSignsTheAccessTokenAgainstTheNewSession(t *testing.T) {
	service, sessions, _ := newTestSessionService()

	issued, _ := service.Issue(context.Background(), testUser, domain.SessionOrigin{})

	claims := service.tokens.Verify(issued.AccessToken)
	if claims == nil || claims.Sid != sessions.rows[0].ID || claims.Sub != testUser.ID {
		t.Errorf("claims = %+v, want the new session %s", claims, sessions.rows[0].ID)
	}
	if issued.SessionID != sessions.rows[0].ID {
		t.Errorf("SessionID = %s", issued.SessionID)
	}
}

func TestIssueDatesTheCookieTheFullWindowAway(t *testing.T) {
	service, _, _ := newTestSessionService()
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }

	issued, _ := service.Issue(context.Background(), testUser, domain.SessionOrigin{})

	if !issued.RefreshExpiresAt.Equal(now.Add(30 * 24 * time.Hour)) {
		t.Errorf("RefreshExpiresAt = %v", issued.RefreshExpiresAt)
	}
}

func TestIssueSweepsTheExpiredSessions(t *testing.T) {
	service, sessions, _ := newTestSessionService()

	service.Issue(context.Background(), testUser, domain.SessionOrigin{})

	if len(sessions.prunedFor) != 1 || sessions.prunedFor[0] != testUser.ID {
		t.Errorf("pruned for %v", sessions.prunedFor)
	}
}

func TestRotateKeepsTheFamilyAndChangesTheToken(t *testing.T) {
	service, sessions, _ := newTestSessionService()
	first, _ := service.Issue(context.Background(), testUser, domain.SessionOrigin{})
	current := *sessions.rows[0]

	second, err := service.Rotate(context.Background(), current, testUser, domain.SessionOrigin{})
	if err != nil {
		t.Fatal(err)
	}

	if sessions.rows[1].FamilyID != current.FamilyID {
		t.Error("the rotated session left its family")
	}
	if second.RefreshToken == first.RefreshToken {
		t.Error("the rotation handed out the same refresh token")
	}
	if sessions.rows[0].RotatedAt == nil {
		t.Error("the old session was not marked rotated")
	}
}

func TestRevokeDropsTheWholeFamily(t *testing.T) {
	service, sessions, events := newTestSessionService()
	sessions.add(domain.AuthSession{UserID: "user-1", TokenHash: domain.HashRefreshToken("token"), FamilyID: "family-1"})

	if err := service.Revoke(context.Background(), "token", domain.SessionOrigin{IP: "10.0.0.1"}); err != nil {
		t.Fatal(err)
	}

	if len(sessions.revokedFamily) != 1 || sessions.revokedFamily[0] != "family-1" {
		t.Errorf("revoked %v", sessions.revokedFamily)
	}
	if logged := events.ofType(domain.AuthEventLoggedOut); len(logged) != 1 || logged[0].UserID != "user-1" {
		t.Errorf("LOGGED_OUT events = %+v", logged)
	}
}

func TestRevokeWithoutASessionIsNotAnError(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{name: "no cookie", token: ""},
		{name: "a token nobody issued", token: "out-of-thin-air"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, sessions, events := newTestSessionService()

			if err := service.Revoke(context.Background(), tt.token, domain.SessionOrigin{}); err != nil {
				t.Fatal(err)
			}
			if len(sessions.revokedFamily) != 0 || len(events.events) != 0 {
				t.Error("something was revoked or published")
			}
		})
	}
}

func TestRevokeEverySessionOf(t *testing.T) {
	service, sessions, events := newTestSessionService()
	one := sessions.add(domain.AuthSession{UserID: "user-1", FamilyID: "a"})
	other := sessions.add(domain.AuthSession{UserID: "user-1", FamilyID: "b"})

	service.RevokeEverySessionOf(context.Background(), "user-1", domain.SessionOrigin{})

	if !sessions.revoked(one.ID) || !sessions.revoked(other.ID) {
		t.Error("a session survived")
	}
	logged := events.ofType(domain.AuthEventLoggedOut)
	if len(logged) != 1 || logged[0].Metadata["everywhere"] != true {
		t.Errorf("events = %+v", logged)
	}
}
