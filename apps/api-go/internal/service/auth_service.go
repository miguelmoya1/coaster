package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type AuthService struct {
	users           ports.AuthUserRepository
	identities      ports.AuthIdentityRepository
	tokens          ports.AuthTokenRepository
	sessionRepo     ports.AuthSessionRepository
	sessions        *SessionService
	google          ports.GoogleVerifier
	pwned           ports.PwnedPasswords
	attempts        ports.LoginAttempts
	mailer          ports.Mailer
	events          ports.EventPublisher
	cache           ports.Cache
	betaAllowlistOn bool
	now             func() time.Time
}

type AuthDependencies struct {
	Users       ports.AuthUserRepository
	Identities  ports.AuthIdentityRepository
	Tokens      ports.AuthTokenRepository
	SessionRepo ports.AuthSessionRepository
	Sessions    *SessionService
	Google      ports.GoogleVerifier
	Pwned       ports.PwnedPasswords
	Attempts    ports.LoginAttempts
	Mailer      ports.Mailer
	Events      ports.EventPublisher
	Cache       ports.Cache

	BetaAllowlistOn bool
}

func NewAuthService(deps AuthDependencies) *AuthService {
	return &AuthService{
		users:           deps.Users,
		identities:      deps.Identities,
		tokens:          deps.Tokens,
		sessionRepo:     deps.SessionRepo,
		sessions:        deps.Sessions,
		google:          deps.Google,
		pwned:           deps.Pwned,
		attempts:        deps.Attempts,
		mailer:          deps.Mailer,
		events:          deps.Events,
		cache:           deps.Cache,
		betaAllowlistOn: deps.BetaAllowlistOn,
		now:             time.Now,
	}
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string

	Language *string
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	email := normalizeEmail(input.Email)

	outside, err := s.outsideBeta(ctx, email)
	if err != nil {
		return domain.IssuedSession{}, err
	}
	if outside {
		slog.Warn("refusing to open an account: not on the beta allowlist", "email", email)
		return domain.IssuedSession{}, domain.Forbidden(domain.CodeBetaAccessRequired)
	}

	existing, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return domain.IssuedSession{}, err
	}
	if existing != nil {
		return domain.IssuedSession{}, domain.Conflict(domain.CodeUserAlreadyExists)
	}

	if err := s.assertNotCompromised(ctx, input.Password); err != nil {
		return domain.IssuedSession{}, err
	}

	passwordHash, err := HashPassword(input.Password)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	now := s.now()
	user, err := s.users.Create(ctx, domain.NewUser{
		Email:             email,
		Name:              strings.TrimSpace(input.Name),
		PasswordHash:      &passwordHash,
		PasswordUpdatedAt: &now,
		Language:          input.Language,
	})
	if err != nil {
		return domain.IssuedSession{}, err
	}

	issued, err := s.sessions.Issue(ctx, *user, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventRegistered,
		UserID:    user.ID,
		Email:     user.Email,
		SessionID: issued.SessionID,
		Origin:    origin,
	})

	return issued, nil
}

func (s *AuthService) LoginWithPassword(ctx context.Context, email, password string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	email = normalizeEmail(email)

	if wait := s.attempts.LockedFor(ctx, email); wait > 0 {
		s.events.Publish(ctx, domain.AuthEventOccurred{
			Type:     domain.AuthEventLoginBlocked,
			Email:    email,
			Origin:   origin,
			Metadata: map[string]any{"retryAfterSeconds": wait},
		})

		return domain.IssuedSession{}, domain.TooManyRequests(domain.CodeTooManyAttempts)
	}

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	var matches bool
	if user != nil && user.PasswordHash != nil {
		matches = VerifyPassword(*user.PasswordHash, password)
	} else {
		matches = burnVerificationTime()
	}

	if user == nil || !matches || !user.Active {
		s.attempts.Remember(ctx, email)

		event := domain.AuthEventOccurred{
			Type:     domain.AuthEventLoginFailed,
			Email:    email,
			Origin:   origin,
			Metadata: map[string]any{"reason": loginFailureReason(user, matches)},
		}
		if user != nil {
			event.UserID = user.ID
		}
		s.events.Publish(ctx, event)

		return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
	}

	s.attempts.Forget(ctx, email)

	issued, err := s.sessions.Issue(ctx, *user, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventLoginSucceeded,
		UserID:    user.ID,
		Email:     email,
		SessionID: issued.SessionID,
		Origin:    origin,
		Metadata:  map[string]any{"method": "password"},
	})

	return issued, nil
}

func loginFailureReason(user *domain.AuthUser, matches bool) string {
	switch {
	case user == nil:
		return "no_account"
	case matches:
		return "inactive"
	default:
		return "wrong_password"
	}
}

func (s *AuthService) LoginWithGoogle(ctx context.Context, credential string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	if !s.google.Configured() {
		slog.Error("refusing a Google sign-in: no client id is configured")
		return domain.IssuedSession{}, domain.ServiceUnavailable(domain.CodeGoogleSignInUnavailable)
	}

	identity := s.google.Verify(ctx, credential)
	if identity == nil {
		s.googleRefused(ctx, origin, "", "", "google_token_rejected")
		return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
	}

	linked, err := s.identities.FindUserBySubject(ctx, domain.AuthProviderGoogle, identity.Subject)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	if linked != nil {
		if !linked.Active {
			s.googleRefused(ctx, origin, linked.ID, identity.Email, "inactive")
			return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
		}

		if err := s.identities.Touch(ctx, domain.AuthProviderGoogle, identity.Subject); err != nil {
			return domain.IssuedSession{}, err
		}

		return s.googleSignedIn(ctx, *linked, identity.Email, origin)
	}

	byEmail, err := s.users.FindByEmail(ctx, identity.Email)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	if byEmail != nil {
		if !byEmail.Active {
			s.googleRefused(ctx, origin, byEmail.ID, identity.Email, "inactive")
			return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
		}

		claimed, err := s.claimForGoogle(ctx, *byEmail, *identity)
		if err != nil {
			return domain.IssuedSession{}, err
		}

		s.events.Publish(ctx, domain.AuthEventOccurred{
			Type:     domain.AuthEventIdentityLinked,
			UserID:   claimed.ID,
			Email:    identity.Email,
			Origin:   origin,
			Metadata: map[string]any{"provider": string(domain.AuthProviderGoogle)},
		})

		return s.googleSignedIn(ctx, *claimed, identity.Email, origin)
	}

	outside, err := s.outsideBeta(ctx, identity.Email)
	if err != nil {
		return domain.IssuedSession{}, err
	}
	if outside {
		slog.Warn("refusing to open an account: not on the beta allowlist", "email", identity.Email)
		s.googleRefused(ctx, origin, "", identity.Email, "outside_beta")
		return domain.IssuedSession{}, domain.Forbidden(domain.CodeBetaAccessRequired)
	}

	name := identity.Name
	if name == "" {
		name, _, _ = strings.Cut(identity.Email, "@")
	}

	now := s.now()
	created, err := s.users.Create(ctx, domain.NewUser{
		Email:           identity.Email,
		Name:            name,
		PhotoURL:        identity.Picture,
		EmailVerifiedAt: &now,
		Identity: &domain.NewIdentity{
			Provider: domain.AuthProviderGoogle,
			Subject:  identity.Subject,
			Email:    identity.Email,
		},
	})
	if err != nil {
		return domain.IssuedSession{}, err
	}

	issued, err := s.sessions.Issue(ctx, *created, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	google := map[string]any{"provider": string(domain.AuthProviderGoogle)}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventRegistered,
		UserID:    created.ID,
		Email:     created.Email,
		SessionID: issued.SessionID,
		Origin:    origin,
		Metadata:  google,
	})
	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:     domain.AuthEventIdentityLinked,
		UserID:   created.ID,
		Email:    created.Email,
		Origin:   origin,
		Metadata: google,
	})

	s.publishGoogleLogin(ctx, issued, created.ID, identity.Email, origin)

	return issued, nil
}

func (s *AuthService) googleSignedIn(ctx context.Context, user domain.AuthUser, email string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	issued, err := s.sessions.Issue(ctx, user, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.publishGoogleLogin(ctx, issued, user.ID, email, origin)

	return issued, nil
}

func (s *AuthService) publishGoogleLogin(ctx context.Context, issued domain.IssuedSession, userID, email string, origin domain.SessionOrigin) {
	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventLoginSucceeded,
		UserID:    userID,
		Email:     email,
		SessionID: issued.SessionID,
		Origin:    origin,
		Metadata:  map[string]any{"method": "google"},
	})
}

func (s *AuthService) googleRefused(ctx context.Context, origin domain.SessionOrigin, userID, email, reason string) {
	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:     domain.AuthEventLoginFailed,
		UserID:   userID,
		Email:    email,
		Origin:   origin,
		Metadata: map[string]any{"method": "google", "reason": reason},
	})
}

func (s *AuthService) claimForGoogle(ctx context.Context, user domain.AuthUser, identity domain.GoogleIdentity) (*domain.AuthUser, error) {
	passwordNobodyProved := user.EmailVerifiedAt == nil && user.PasswordHash != nil

	if passwordNobodyProved {
		slog.Warn("dropping an unverified password: Google has proved the address", "userId", user.ID)
		if err := s.sessionRepo.RevokeEverySessionOf(ctx, user.ID); err != nil {
			return nil, err
		}
	}

	err := s.identities.Link(ctx, user.ID, domain.NewIdentity{
		Provider: domain.AuthProviderGoogle,
		Subject:  identity.Subject,
		Email:    identity.Email,
	})
	if err != nil {
		return nil, err
	}

	var photo *string
	if user.PhotoURL == nil && identity.Picture != nil {
		photo = identity.Picture
	}

	if err := s.users.ClaimForGoogle(ctx, user.ID, passwordNobodyProved, photo); err != nil {
		return nil, err
	}

	return s.reloadUser(ctx, user.ID)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	expired := domain.Unauthorized(domain.CodeSessionExpired)

	if refreshToken == "" {
		return domain.IssuedSession{}, expired
	}

	session, err := s.sessionRepo.FindByTokenHash(ctx, domain.HashRefreshToken(refreshToken))
	if err != nil {
		return domain.IssuedSession{}, err
	}

	now := s.now()

	if session == nil || session.RevokedAt != nil || !session.ExpiresAt.After(now) {
		return domain.IssuedSession{}, expired
	}

	if session.RotatedAt != nil && !domain.IsWithinReuseGrace(*session.RotatedAt, now) {
		slog.Warn("refresh token replayed; dropping the whole family", "userId", session.UserID)

		if err := s.sessionRepo.RevokeFamily(ctx, session.FamilyID); err != nil {
			return domain.IssuedSession{}, err
		}

		s.events.Publish(ctx, domain.AuthEventOccurred{
			Type:      domain.AuthEventRefreshReuseDetected,
			UserID:    session.UserID,
			SessionID: session.ID,
			Origin:    origin,
		})

		return domain.IssuedSession{}, expired
	}

	user, err := s.users.FindByID(ctx, session.UserID)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	if user == nil || !user.Active {
		if err := s.sessionRepo.RevokeFamily(ctx, session.FamilyID); err != nil {
			return domain.IssuedSession{}, err
		}
		return domain.IssuedSession{}, expired
	}

	return s.sessions.Rotate(ctx, *session, *user, origin)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string, origin domain.SessionOrigin) error {
	return s.sessions.Revoke(ctx, refreshToken, origin)
}

func (s *AuthService) LogoutEverywhere(ctx context.Context, userID string, origin domain.SessionOrigin) error {
	return s.sessions.RevokeEverySessionOf(ctx, userID, origin)
}

func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return err
	}

	if user == nil || !user.Active {
		slog.Debug("nobody to write to; answering as if there were")
		return nil
	}

	token, err := s.tokens.Issue(ctx, user.ID, domain.AuthTokenPasswordReset)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:   domain.AuthEventPasswordResetRequested,
		UserID: user.ID,
		Email:  user.Email,
	})

	return s.mailer.SendPasswordReset(ctx, user.Email, user.Name, token, user.MailLanguage())
}

func (s *AuthService) PasswordReset(ctx context.Context, token string) (domain.PasswordResetSummary, error) {
	stored, err := s.tokens.FindUsable(ctx, token, domain.AuthTokenPasswordReset)
	if err != nil {
		return domain.PasswordResetSummary{}, err
	}
	if stored == nil {
		return domain.PasswordResetSummary{}, domain.BadRequest(domain.CodeInvalidToken)
	}

	return domain.PasswordResetSummary{Email: stored.User.Email}, nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, password string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	if err := s.assertNotCompromised(ctx, password); err != nil {
		return domain.IssuedSession{}, err
	}

	stored, err := s.spendToken(ctx, token, domain.AuthTokenPasswordReset)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	if !stored.User.Active {
		return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
	}

	if err := s.sessionRepo.RevokeEverySessionOf(ctx, stored.UserID); err != nil {
		return domain.IssuedSession{}, err
	}

	user, err := s.setPassword(ctx, stored.UserID, password, true)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.warnPasswordChanged(ctx, *user)

	issued, err := s.sessions.Issue(ctx, *user, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventPasswordResetCompleted,
		UserID:    user.ID,
		Email:     user.Email,
		SessionID: issued.SessionID,
		Origin:    origin,
	})

	return issued, nil
}

func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	stored, err := s.spendToken(ctx, token, domain.AuthTokenEmailVerification)
	if err != nil {
		return err
	}

	if err := s.users.MarkEmailVerified(ctx, stored.UserID); err != nil {
		return err
	}
	s.cache.Forget(ctx, userCacheKey(stored.UserID))

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:   domain.AuthEventEmailVerified,
		UserID: stored.UserID,
		Email:  stored.User.Email,
	})

	return nil
}

func (s *AuthService) Invite(ctx context.Context, token string) (domain.InviteSummary, error) {
	stored, err := s.tokens.FindUsable(ctx, token, domain.AuthTokenInvite)
	if err != nil {
		return domain.InviteSummary{}, err
	}
	if stored == nil {
		return domain.InviteSummary{}, domain.BadRequest(domain.CodeInvalidToken)
	}

	identities, err := s.identities.ListOf(ctx, stored.UserID)
	if err != nil {
		return domain.InviteSummary{}, err
	}

	return domain.InviteSummary{
		Email:          stored.User.Email,
		Name:           stored.User.Name,
		HasCredentials: stored.User.PasswordHash != nil || len(identities) > 0,
	}, nil
}

func (s *AuthService) AcceptInvite(ctx context.Context, token, password string, origin domain.SessionOrigin) (domain.IssuedSession, error) {
	if err := s.assertNotCompromised(ctx, password); err != nil {
		return domain.IssuedSession{}, err
	}

	stored, err := s.spendToken(ctx, token, domain.AuthTokenInvite)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	if !stored.User.Active {
		return domain.IssuedSession{}, domain.Unauthorized(domain.CodeInvalidCredentials)
	}

	if stored.User.PasswordHash != nil {
		return domain.IssuedSession{}, domain.BadRequest(domain.CodePasswordAlreadySet)
	}

	user, err := s.setPassword(ctx, stored.UserID, password, true)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	issued, err := s.sessions.Issue(ctx, *user, origin)
	if err != nil {
		return domain.IssuedSession{}, err
	}

	s.events.Publish(ctx, domain.AuthEventOccurred{
		Type:      domain.AuthEventInviteAccepted,
		UserID:    user.ID,
		Email:     user.Email,
		SessionID: issued.SessionID,
		Origin:    origin,
	})

	return issued, nil
}

func (s *AuthService) spendToken(ctx context.Context, token string, purpose domain.AuthTokenPurpose) (*domain.AuthToken, error) {
	stored, err := s.tokens.FindUsable(ctx, token, purpose)
	if err != nil {
		return nil, err
	}
	if stored == nil {
		return nil, domain.BadRequest(domain.CodeInvalidToken)
	}

	spent, err := s.tokens.Spend(ctx, stored.ID)
	if err != nil {
		return nil, err
	}
	if !spent {
		return nil, domain.BadRequest(domain.CodeInvalidToken)
	}

	return stored, nil
}

func (s *AuthService) setPassword(ctx context.Context, userID, password string, markEmailVerified bool) (*domain.AuthUser, error) {
	passwordHash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}

	if err := s.users.SetPassword(ctx, userID, passwordHash, markEmailVerified); err != nil {
		return nil, err
	}

	return s.reloadUser(ctx, userID)
}

func (s *AuthService) reloadUser(ctx context.Context, userID string) (*domain.AuthUser, error) {
	s.cache.Forget(ctx, userCacheKey(userID))

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, domain.NotFound(domain.CodeUserNotFound)
	}

	return user, nil
}

func (s *AuthService) warnPasswordChanged(ctx context.Context, user domain.AuthUser) {
	if err := s.mailer.SendPasswordChanged(ctx, user.Email, user.Name, user.MailLanguage()); err != nil {
		slog.Error("could not warn the user of the password change", "userId", user.ID, "error", err)
	}
}

func (s *AuthService) assertNotCompromised(ctx context.Context, password string) error {
	if s.pwned.Compromised(ctx, password) {
		return domain.BadRequest(domain.CodePasswordCompromised)
	}
	return nil
}

func (s *AuthService) outsideBeta(ctx context.Context, email string) (bool, error) {
	if !s.betaAllowlistOn {
		return false, nil
	}

	onList, err := s.users.IsBetaTester(ctx, email)
	if err != nil {
		return false, err
	}

	return !onList, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
