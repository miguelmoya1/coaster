package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type AuthUserRepository interface {
	FindByID(ctx context.Context, id string) (*domain.AuthUser, error)

	FindByEmail(ctx context.Context, email string) (*domain.AuthUser, error)

	Create(ctx context.Context, user domain.NewUser) (*domain.AuthUser, error)

	SetPassword(ctx context.Context, userID, passwordHash string, markEmailVerified bool) error
	MarkEmailVerified(ctx context.Context, userID string) error

	ClaimForGoogle(ctx context.Context, userID string, dropPassword bool, photoURL *string) error
	IsBetaTester(ctx context.Context, email string) (bool, error)
}

type AuthSessionRepository interface {
	Create(ctx context.Context, session domain.NewAuthSession) (*domain.AuthSession, error)

	FindByTokenHash(ctx context.Context, tokenHash string) (*domain.AuthSession, error)

	ListLiveOf(ctx context.Context, userID string) ([]domain.AuthSession, error)

	FindOwnedBy(ctx context.Context, id, userID string) (*domain.AuthSession, error)

	Rotate(ctx context.Context, currentID string, next domain.NewAuthSession) (*domain.AuthSession, error)
	RevokeFamily(ctx context.Context, familyID string) error
	RevokeEveryOtherSessionOf(ctx context.Context, userID, keepID string) error
	RevokeEveryOtherFamilyOf(ctx context.Context, userID, keepFamilyID string) error
	RevokeEverySessionOf(ctx context.Context, userID string) error
	DeleteExpiredOf(ctx context.Context, userID string) error
}

type AuthTokenRepository interface {
	Issue(ctx context.Context, userID string, purpose domain.AuthTokenPurpose) (string, error)

	FindUsable(ctx context.Context, token string, purpose domain.AuthTokenPurpose) (*domain.AuthToken, error)

	Spend(ctx context.Context, id string) (bool, error)
}

type AuthIdentityRepository interface {
	FindUserBySubject(ctx context.Context, provider domain.AuthProvider, subject string) (*domain.AuthUser, error)
	Touch(ctx context.Context, provider domain.AuthProvider, subject string) error

	Link(ctx context.Context, userID string, identity domain.NewIdentity) error

	ListOf(ctx context.Context, userID string) ([]domain.AuthIdentity, error)
	Delete(ctx context.Context, userID string, provider domain.AuthProvider) error
}

type AuthEventRepository interface {
	Record(ctx context.Context, event domain.AuthEventOccurred) error
	FindRecentOf(ctx context.Context, userID string, limit int) ([]domain.AuthEventRecord, error)
}

type Mailer interface {
	SendInvite(ctx context.Context, to string, invite domain.InviteEmail, language string) error
	SendEmailVerification(ctx context.Context, to, name, token, language string) error
	SendPasswordReset(ctx context.Context, to, name, token, language string) error
	SendPasswordChanged(ctx context.Context, to, name, language string) error
}

type GoogleVerifier interface {
	Configured() bool

	Verify(ctx context.Context, credential string) *domain.GoogleIdentity
}

type PwnedPasswords interface {
	Compromised(ctx context.Context, password string) bool
}

type LoginAttempts interface {
	LockedFor(ctx context.Context, email string) int
	Remember(ctx context.Context, email string)
	Forget(ctx context.Context, email string)
}
