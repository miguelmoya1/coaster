package domain

import "time"

const (
	PasswordMinLength = 8
	PasswordMaxLength = 128
)

const AccessTokenTTL = 15 * time.Minute

type AuthProvider string

const AuthProviderGoogle AuthProvider = "GOOGLE"

type AuthTokenPurpose string

const (
	AuthTokenEmailVerification AuthTokenPurpose = "EMAIL_VERIFICATION"
	AuthTokenPasswordReset     AuthTokenPurpose = "PASSWORD_RESET"
	AuthTokenInvite            AuthTokenPurpose = "INVITE"
)

type AuthEventType string

const (
	AuthEventRegistered             AuthEventType = "REGISTERED"
	AuthEventLoginSucceeded         AuthEventType = "LOGIN_SUCCEEDED"
	AuthEventLoginFailed            AuthEventType = "LOGIN_FAILED"
	AuthEventLoginBlocked           AuthEventType = "LOGIN_BLOCKED"
	AuthEventLoggedOut              AuthEventType = "LOGGED_OUT"
	AuthEventPasswordChanged        AuthEventType = "PASSWORD_CHANGED"
	AuthEventPasswordResetRequested AuthEventType = "PASSWORD_RESET_REQUESTED"
	AuthEventPasswordResetCompleted AuthEventType = "PASSWORD_RESET_COMPLETED"
	AuthEventInviteAccepted         AuthEventType = "INVITE_ACCEPTED"
	AuthEventEmailVerified          AuthEventType = "EMAIL_VERIFIED"
	AuthEventIdentityLinked         AuthEventType = "IDENTITY_LINKED"
	AuthEventIdentityUnlinked       AuthEventType = "IDENTITY_UNLINKED"
	AuthEventRefreshReuseDetected   AuthEventType = "REFRESH_REUSE_DETECTED"
)

type AuthUser struct {
	ID              string
	Email           string
	Name            string
	PhotoURL        *string
	PasswordHash    *string
	EmailVerifiedAt *time.Time
	Active          bool
	Role            Role

	Language *string
}

func (u AuthUser) ToUser() User {
	language := DefaultLanguage
	if u.Language != nil {
		language = *u.Language
	}

	return User{
		ID:            u.ID,
		Email:         u.Email,
		Name:          u.Name,
		PhotoURL:      u.PhotoURL,
		Active:        u.Active,
		Role:          u.Role,
		Language:      language,
		EmailVerified: u.EmailVerifiedAt != nil,
	}
}

func (u AuthUser) MailLanguage() string {
	if u.Language == nil {
		return ""
	}
	return *u.Language
}

type NewUser struct {
	Email             string
	Name              string
	PhotoURL          *string
	PasswordHash      *string
	PasswordUpdatedAt *time.Time
	EmailVerifiedAt   *time.Time

	Language *string
	Identity *NewIdentity
}

type NewIdentity struct {
	Provider AuthProvider
	Subject  string
	Email    string
}

type SessionOrigin struct {
	UserAgent string
	IP        string
}

type AuthSession struct {
	ID         string
	UserID     string
	TokenHash  string
	FamilyID   string
	UserAgent  *string
	IP         *string
	CreatedAt  time.Time
	LastUsedAt time.Time
	ExpiresAt  time.Time
	RotatedAt  *time.Time
	RevokedAt  *time.Time
}

type NewAuthSession struct {
	UserID    string
	TokenHash string
	FamilyID  string
	ExpiresAt time.Time
	Origin    SessionOrigin
}

type AuthToken struct {
	ID        string
	UserID    string
	Purpose   AuthTokenPurpose
	ExpiresAt time.Time
	UsedAt    *time.Time
	User      AuthUser
}

type AuthIdentity struct {
	Provider  AuthProvider
	Subject   string
	Email     string
	CreatedAt time.Time
}

type AuthEvent struct {
	Type      AuthEventType
	UserID    string
	Email     string
	SessionID string
	Origin    SessionOrigin
	Metadata  map[string]any
}

type AuthEventRecord struct {
	ID        string         `json:"id"`
	Type      AuthEventType  `json:"type"`
	UserID    *string        `json:"userId"`
	Email     *string        `json:"email"`
	SessionID *string        `json:"sessionId"`
	IP        *string        `json:"ip"`
	UserAgent *string        `json:"userAgent"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt Time           `json:"createdAt"`
}

type GoogleIdentity struct {
	Subject string
	Email   string
	Name    string
	Picture *string
}

type SessionClaims struct {
	Sub string
	Sid string
}

type IssuedSession struct {
	User             User
	SessionID        string
	AccessToken      string
	RefreshToken     string
	RefreshExpiresAt time.Time
}

type LinkedIdentity struct {
	Provider AuthProvider `json:"provider"`
	Email    string       `json:"email"`
	LinkedAt Time         `json:"linkedAt"`
}

type AccountSummary struct {
	Email         string           `json:"email"`
	Name          string           `json:"name"`
	EmailVerified bool             `json:"emailVerified"`
	HasPassword   bool             `json:"hasPassword"`
	Identities    []LinkedIdentity `json:"identities"`
}

type AccountSession struct {
	ID         string  `json:"id"`
	Current    bool    `json:"current"`
	UserAgent  *string `json:"userAgent"`
	IP         *string `json:"ip"`
	CreatedAt  Time    `json:"createdAt"`
	LastUsedAt Time    `json:"lastUsedAt"`
	ExpiresAt  Time    `json:"expiresAt"`
}

type InviteSummary struct {
	Email          string `json:"email"`
	Name           string `json:"name"`
	HasCredentials bool   `json:"hasCredentials"`
}

type PasswordResetSummary struct {
	Email string `json:"email"`
}

type InviteEmail struct {
	EstablishmentName string
	InviterName       string
	Token             string
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string

	Language *string
}

type SetPasswordInput struct {
	UserID    string
	SessionID string
	Password  string

	CurrentPassword string
}
