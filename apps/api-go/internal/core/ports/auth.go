package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// AuthUserRepository reads and writes the user rows signing in needs.
// The finders return nil, nil when there is no such user.
type AuthUserRepository interface {
	FindByID(ctx context.Context, id string) (*domain.AuthUser, error)
	// FindByEmail trims and lowercases the address before looking.
	FindByEmail(ctx context.Context, email string) (*domain.AuthUser, error)
	// Create opens the account, its preferences and its identity, if any, in one transaction.
	Create(ctx context.Context, user domain.NewUser) (*domain.AuthUser, error)
	// SetPassword stores a new hash. With markEmailVerified it also confirms the address,
	// keeping the date it already had.
	SetPassword(ctx context.Context, userID, passwordHash string, markEmailVerified bool) error
	MarkEmailVerified(ctx context.Context, userID string) error
	// ClaimForGoogle confirms the address, drops the password if asked, and takes the photo
	// only when the user has none.
	ClaimForGoogle(ctx context.Context, userID string, dropPassword bool, photoURL *string) error
	IsBetaTester(ctx context.Context, email string) (bool, error)
}

// AuthSessionRepository stores the refresh token sessions.
type AuthSessionRepository interface {
	Create(ctx context.Context, session domain.NewAuthSession) (*domain.AuthSession, error)
	// FindByTokenHash returns nil, nil when no session has that hash.
	FindByTokenHash(ctx context.Context, tokenHash string) (*domain.AuthSession, error)
	// ListLiveOf lists the sessions that are neither revoked nor expired, last used first.
	ListLiveOf(ctx context.Context, userID string) ([]domain.AuthSession, error)
	// FindOwnedBy returns nil, nil when the session does not exist or is someone else's.
	FindOwnedBy(ctx context.Context, id, userID string) (*domain.AuthSession, error)
	// Rotate marks the current session as rotated and stores the next one, in one transaction.
	Rotate(ctx context.Context, currentID string, next domain.NewAuthSession) (*domain.AuthSession, error)
	RevokeFamily(ctx context.Context, familyID string) error
	RevokeEveryOtherSessionOf(ctx context.Context, userID, keepID string) error
	RevokeEveryOtherFamilyOf(ctx context.Context, userID, keepFamilyID string) error
	RevokeEverySessionOf(ctx context.Context, userID string) error
	DeleteExpiredOf(ctx context.Context, userID string) error
}

// AuthTokenRepository stores the emailed tokens, only as hashes.
type AuthTokenRepository interface {
	// Issue burns the unused tokens of the same purpose and returns a new one, in one transaction.
	Issue(ctx context.Context, userID string, purpose domain.AuthTokenPurpose) (string, error)
	// FindUsable returns nil, nil unless the token exists, is for purpose, is unused and has not expired.
	FindUsable(ctx context.Context, token string, purpose domain.AuthTokenPurpose) (*domain.AuthToken, error)
	// Spend marks the token used. Only the first caller gets true.
	Spend(ctx context.Context, id string) (bool, error)
}

// AuthIdentityRepository stores the outside accounts linked to users.
type AuthIdentityRepository interface {
	// FindUserBySubject returns nil, nil when no user is linked to that subject.
	FindUserBySubject(ctx context.Context, provider domain.AuthProvider, subject string) (*domain.AuthUser, error)
	Touch(ctx context.Context, provider domain.AuthProvider, subject string) error
	// Link creates the identity, or points the user's existing one of that provider at the new subject.
	Link(ctx context.Context, userID string, identity domain.NewIdentity) error
	// ListOf lists a user's identities, oldest first.
	ListOf(ctx context.Context, userID string) ([]domain.AuthIdentity, error)
	Delete(ctx context.Context, userID string, provider domain.AuthProvider) error
}

// AuthEventRepository writes the auth log.
type AuthEventRepository interface {
	Record(ctx context.Context, event domain.AuthEventOccurred) error
	FindRecentOf(ctx context.Context, userID string, limit int) ([]domain.AuthEventRecord, error)
}

// Mailer sends the auth emails (AUTH_MAILER in Nest). language is "" for the default.
type Mailer interface {
	SendInvite(ctx context.Context, to string, invite domain.InviteEmail, language string) error
	SendEmailVerification(ctx context.Context, to, name, token, language string) error
	SendPasswordReset(ctx context.Context, to, name, token, language string) error
	SendPasswordChanged(ctx context.Context, to, name, language string) error
}

// GoogleVerifier checks Google identity tokens.
type GoogleVerifier interface {
	// Configured reports whether a Google client id is set.
	Configured() bool
	// Verify returns nil when Google does not vouch for the credential.
	Verify(ctx context.Context, credential string) *domain.GoogleIdentity
}

// PwnedPasswords asks Have I Been Pwned whether a password has leaked. It answers false when
// the check is off or the service cannot be reached.
type PwnedPasswords interface {
	Compromised(ctx context.Context, password string) bool
}

// LoginAttempts counts failed logins per address.
type LoginAttempts interface {
	// LockedFor is how many seconds the address still has to wait; zero when it may try.
	LockedFor(ctx context.Context, email string) int
	Remember(ctx context.Context, email string)
	Forget(ctx context.Context, email string)
}
