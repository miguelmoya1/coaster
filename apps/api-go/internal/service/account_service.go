package service

import (
	"context"
	"log/slog"
	"slices"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type AccountService struct {
	users      ports.AuthUserRepository
	identities ports.AuthIdentityRepository
	tokens     ports.AuthTokenRepository
	sessions   ports.AuthSessionRepository
	pwned      ports.PwnedPasswords
	mailer     ports.Mailer
	events     ports.EventPublisher
	cache      ports.Cache
}

type AccountDependencies struct {
	Users      ports.AuthUserRepository
	Identities ports.AuthIdentityRepository
	Tokens     ports.AuthTokenRepository
	Sessions   ports.AuthSessionRepository
	Pwned      ports.PwnedPasswords
	Mailer     ports.Mailer
	Events     ports.EventPublisher
	Cache      ports.Cache
}

func NewAccountService(deps AccountDependencies) *AccountService {
	return &AccountService{
		users:      deps.Users,
		identities: deps.Identities,
		tokens:     deps.Tokens,
		sessions:   deps.Sessions,
		pwned:      deps.Pwned,
		mailer:     deps.Mailer,
		events:     deps.Events,
		cache:      deps.Cache,
	}
}

func (s *AccountService) Account(ctx context.Context, userID string) (domain.AccountSummary, error) {
	user, err := s.findUser(ctx, userID)
	if err != nil {
		return domain.AccountSummary{}, err
	}

	identities, err := s.identities.ListOf(ctx, userID)
	if err != nil {
		return domain.AccountSummary{}, err
	}

	linked := make([]domain.LinkedIdentity, 0, len(identities))
	for _, identity := range identities {
		linked = append(linked, domain.LinkedIdentity{
			Provider: identity.Provider,
			Email:    identity.Email,
			LinkedAt: domain.NewTime(identity.CreatedAt),
		})
	}

	return domain.AccountSummary{
		Email:         user.Email,
		Name:          user.Name,
		EmailVerified: user.EmailVerifiedAt != nil,
		HasPassword:   user.PasswordHash != nil,
		Identities:    linked,
	}, nil
}

func (s *AccountService) RequestEmailVerification(ctx context.Context, userID string) error {
	user, err := s.findUser(ctx, userID)
	if err != nil {
		return err
	}

	if user.EmailVerifiedAt != nil {
		slog.Debug("nothing to send: the address is verified already", "userId", user.ID)
		return nil
	}

	token, err := s.tokens.Issue(ctx, user.ID, domain.AuthTokenEmailVerification)
	if err != nil {
		return err
	}

	return s.mailer.SendEmailVerification(ctx, user.Email, user.Name, token, user.MailLanguage())
}

func (s *AccountService) SetPassword(ctx context.Context, input domain.SetPasswordInput, origin domain.SessionOrigin) error {
	current, err := s.findUser(ctx, input.UserID)
	if err != nil {
		return err
	}

	if current.PasswordHash != nil {
		if input.CurrentPassword == "" {
			return domain.BadRequest(domain.CodePasswordAlreadySet)
		}

		if !VerifyPassword(*current.PasswordHash, input.CurrentPassword) {
			return domain.Unauthorized(domain.CodeInvalidCredentials)
		}
	}

	if s.pwned.Compromised(ctx, input.Password) {
		return domain.BadRequest(domain.CodePasswordCompromised)
	}

	if err := s.sessions.RevokeEveryOtherSessionOf(ctx, input.UserID, input.SessionID); err != nil {
		return err
	}

	passwordHash, err := HashPassword(input.Password)
	if err != nil {
		return err
	}

	if err := s.users.SetPassword(ctx, input.UserID, passwordHash, false); err != nil {
		return err
	}
	s.cache.Forget(ctx, userCacheKey(input.UserID))

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventPasswordChanged,
		UserID:    current.ID,
		Email:     current.Email,
		SessionID: input.SessionID,
		Origin:    origin,
		Metadata:  map[string]any{"first": current.PasswordHash == nil},
	})

	if err := s.mailer.SendPasswordChanged(ctx, current.Email, current.Name, current.MailLanguage()); err != nil {
		slog.Error("could not warn the user of the password change", "userId", current.ID, "error", err)
	}

	return nil
}

func (s *AccountService) Sessions(ctx context.Context, userID, currentSessionID string) ([]domain.AccountSession, error) {
	live, err := s.sessions.ListLiveOf(ctx, userID)
	if err != nil {
		return nil, err
	}

	var order []string
	families := make(map[string][]domain.AuthSession)
	for _, session := range live {
		if _, seen := families[session.FamilyID]; !seen {
			order = append(order, session.FamilyID)
		}
		families[session.FamilyID] = append(families[session.FamilyID], session)
	}

	summaries := make([]domain.AccountSession, 0, len(order))
	for _, familyID := range order {
		summaries = append(summaries, summarizeFamily(families[familyID], currentSessionID))
	}

	slices.SortStableFunc(summaries, func(a, b domain.AccountSession) int {
		return b.LastUsedAt.Compare(a.LastUsedAt.Time)
	})

	return summaries, nil
}

func summarizeFamily(family []domain.AuthSession, currentSessionID string) domain.AccountSession {
	head := family[0]
	for _, session := range family {
		if session.RotatedAt == nil {
			head = session
			break
		}
	}

	var known *domain.AuthSession
	for i, session := range family {
		if session.UserAgent != nil || session.IP != nil {
			known = &family[i]
			break
		}
	}

	userAgent := head.UserAgent
	ip := head.IP
	if userAgent == nil && known != nil {
		userAgent = known.UserAgent
	}
	if ip == nil && known != nil {
		ip = known.IP
	}

	createdAt := head.CreatedAt
	lastUsedAt := head.LastUsedAt
	current := false
	for _, session := range family {
		if session.CreatedAt.Before(createdAt) {
			createdAt = session.CreatedAt
		}
		if session.LastUsedAt.After(lastUsedAt) {
			lastUsedAt = session.LastUsedAt
		}
		if currentSessionID != "" && session.ID == currentSessionID {
			current = true
		}
	}

	return domain.AccountSession{
		ID:         head.ID,
		Current:    current,
		UserAgent:  userAgent,
		IP:         ip,
		CreatedAt:  domain.NewTime(createdAt),
		LastUsedAt: domain.NewTime(lastUsedAt),
		ExpiresAt:  domain.NewTime(head.ExpiresAt),
	}
}

func (s *AccountService) CloseOtherSessions(ctx context.Context, userID, currentSessionID string) error {
	current, err := s.ownedSession(ctx, currentSessionID, userID)
	if err != nil {
		return err
	}

	if current == nil {
		return s.sessions.RevokeEverySessionOf(ctx, userID)
	}

	return s.sessions.RevokeEveryOtherFamilyOf(ctx, userID, current.FamilyID)
}

func (s *AccountService) CloseSession(ctx context.Context, userID, sessionID, currentSessionID string) error {
	session, err := s.sessions.FindOwnedBy(ctx, sessionID, userID)
	if err != nil {
		return err
	}
	if session == nil {
		return domain.NotFound(domain.CodeSessionNotFound)
	}

	current, err := s.ownedSession(ctx, currentSessionID, userID)
	if err != nil {
		return err
	}

	if current != nil && current.FamilyID == session.FamilyID {
		return domain.BadRequest(domain.CodeCannotCloseCurrentSession)
	}

	return s.sessions.RevokeFamily(ctx, session.FamilyID)
}

func (s *AccountService) UnlinkIdentity(ctx context.Context, userID string, provider domain.AuthProvider, origin domain.SessionOrigin) error {
	user, err := s.findUser(ctx, userID)
	if err != nil {
		return err
	}

	identities, err := s.identities.ListOf(ctx, userID)
	if err != nil {
		return err
	}

	linked := slices.ContainsFunc(identities, func(identity domain.AuthIdentity) bool {
		return identity.Provider == provider
	})
	if !linked {
		return domain.BadRequest(domain.CodeIdentityNotLinked)
	}

	waysIn := len(identities)
	if user.PasswordHash != nil {
		waysIn++
	}
	if waysIn <= 1 {
		return domain.BadRequest(domain.CodeLastWayIn)
	}

	if err := s.identities.Delete(ctx, userID, provider); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:     domain.AuthEventIdentityUnlinked,
		UserID:   user.ID,
		Email:    user.Email,
		Origin:   origin,
		Metadata: map[string]any{"provider": string(provider)},
	})

	return nil
}

func (s *AccountService) findUser(ctx context.Context, userID string) (*domain.AuthUser, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, domain.NotFound(domain.CodeUserNotFound)
	}
	return user, nil
}

func (s *AccountService) ownedSession(ctx context.Context, id, userID string) (*domain.AuthSession, error) {
	if id == "" {
		return nil, nil
	}
	return s.sessions.FindOwnedBy(ctx, id, userID)
}
