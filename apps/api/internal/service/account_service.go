package service

import (
	"cmp"
	"context"
	"log/slog"
	"slices"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
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

	s.events.Publish(ctx, domain.AuthEvent{
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
	head := familyHead(family)

	userAgent, ip := head.UserAgent, head.IP
	if i := slices.IndexFunc(family, knowsTheDevice); i >= 0 {
		userAgent = cmp.Or(userAgent, family[i].UserAgent)
		ip = cmp.Or(ip, family[i].IP)
	}

	first := slices.MinFunc(family, func(a, b domain.AuthSession) int { return a.CreatedAt.Compare(b.CreatedAt) })
	last := slices.MaxFunc(family, func(a, b domain.AuthSession) int { return a.LastUsedAt.Compare(b.LastUsedAt) })
	current := currentSessionID != "" && slices.ContainsFunc(family, func(session domain.AuthSession) bool {
		return session.ID == currentSessionID
	})

	return domain.AccountSession{
		ID:         head.ID,
		Current:    current,
		UserAgent:  userAgent,
		IP:         ip,
		CreatedAt:  domain.NewTime(first.CreatedAt),
		LastUsedAt: domain.NewTime(last.LastUsedAt),
		ExpiresAt:  domain.NewTime(head.ExpiresAt),
	}
}

func familyHead(family []domain.AuthSession) domain.AuthSession {
	i := slices.IndexFunc(family, func(session domain.AuthSession) bool { return session.RotatedAt == nil })
	if i < 0 {
		return family[0]
	}
	return family[i]
}

func knowsTheDevice(session domain.AuthSession) bool {
	return session.UserAgent != nil || session.IP != nil
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

	s.events.Publish(ctx, domain.AuthEvent{
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
