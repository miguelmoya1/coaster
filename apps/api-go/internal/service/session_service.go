package service

import (
	"context"
	"time"
	"uuid"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// SessionService opens, rotates and closes sessions: a refresh token for the cookie, stored
// only as a hash, and an access token for the body.
type SessionService struct {
	sessions ports.AuthSessionRepository
	tokens   *AccessTokenService
	events   ports.EventPublisher
	now      func() time.Time
}

func NewSessionService(sessions ports.AuthSessionRepository, tokens *AccessTokenService, events ports.EventPublisher) *SessionService {
	return &SessionService{sessions: sessions, tokens: tokens, events: events, now: time.Now}
}

// Issue opens a new session, in a new family, and sweeps the user's expired ones.
func (s *SessionService) Issue(ctx context.Context, user domain.AuthUser, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	if err := s.sessions.DeleteExpiredOf(ctx, user.ID); err != nil {
		return domain.IssuedSession{}, err
	}

	refreshToken := domain.NewRefreshToken()

	session, err := s.sessions.Create(ctx, domain.NewAuthSession{
		UserID:    user.ID,
		TokenHash: domain.HashRefreshToken(refreshToken),
		FamilyID:  uuid.NewV4().String(),
		ExpiresAt: domain.RefreshExpiryFrom(s.now()),
		Origin:    origin,
	})
	if err != nil {
		return domain.IssuedSession{}, err
	}

	return s.issued(user, session, refreshToken)
}

// Rotate replaces the current session with a new one in the same family.
func (s *SessionService) Rotate(ctx context.Context, current domain.AuthSession, user domain.AuthUser, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	refreshToken := domain.NewRefreshToken()

	session, err := s.sessions.Rotate(ctx, current.ID, domain.NewAuthSession{
		UserID:    user.ID,
		TokenHash: domain.HashRefreshToken(refreshToken),
		FamilyID:  current.FamilyID,
		ExpiresAt: domain.RefreshExpiryFrom(s.now()),
		Origin:    origin,
	})
	if err != nil {
		return domain.IssuedSession{}, err
	}

	return s.issued(user, session, refreshToken)
}

// Revoke closes the family of the refresh token, if there is one. Logging out without a
// cookie, or with one nobody issued, is not an error.
func (s *SessionService) Revoke(ctx context.Context, refreshToken string, origin domain.SessionOrigin) error {
	if refreshToken == "" {
		return nil
	}

	session, err := s.sessions.FindByTokenHash(ctx, domain.HashRefreshToken(refreshToken))
	if err != nil || session == nil {
		return err
	}

	if err := s.sessions.RevokeFamily(ctx, session.FamilyID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventLoggedOut,
		UserID:    session.UserID,
		SessionID: session.ID,
		Origin:    origin,
	})

	return nil
}

// RevokeEverySessionOf closes every session of the user, on every device.
func (s *SessionService) RevokeEverySessionOf(ctx context.Context, userID string, origin domain.SessionOrigin) error {
	if err := s.sessions.RevokeEverySessionOf(ctx, userID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:     domain.AuthEventLoggedOut,
		UserID:   userID,
		Origin:   origin,
		Metadata: map[string]any{"everywhere": true},
	})

	return nil
}

func (s *SessionService) issued(user domain.AuthUser, session *domain.AuthSession, refreshToken string) (domain.IssuedSession, error) {
	accessToken, err := s.tokens.Sign(user.ID, session.ID)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	return domain.IssuedSession{
		User:             user.ToUser(),
		SessionID:        session.ID,
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		RefreshExpiresAt: session.ExpiresAt,
	}, nil
}
