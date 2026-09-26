package domain

import "time"

// Password length limits of the auth DTOs.
const (
	PasswordMinLength = 8
	PasswordMaxLength = 128
)

// AccessTokenTTL is how long an access token lasts. The web app gets it as expiresIn.
const AccessTokenTTL = 15 * time.Minute

// AuthProvider is an outside way to sign in (AuthProvider in the Prisma schema).
type AuthProvider string

const AuthProviderGoogle AuthProvider = "GOOGLE"

// AuthTokenPurpose is what an emailed token is for (AuthTokenPurpose in the Prisma schema).
type AuthTokenPurpose string

const (
	AuthTokenEmailVerification AuthTokenPurpose = "EMAIL_VERIFICATION"
	AuthTokenPasswordReset     AuthTokenPurpose = "PASSWORD_RESET"
	AuthTokenInvite            AuthTokenPurpose = "INVITE"
)

// AuthEventType is a line of the auth log (AuthEventType in the Prisma schema).
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

// AuthUser is a user row as signing in needs it: with the password hash and the dates.
// It never leaves the API; handlers send a User.
type AuthUser struct {
	ID              string
	Email           string
	Name            string
	PhotoURL        *string
	PasswordHash    *string
	EmailVerifiedAt *time.Time
	Active          bool
	Role            Role
	// Language is nil when the user has no preferences row.
	Language *string
}

// ToUser is UsersMapper.toDomain: the user the API sends.
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

// MailLanguage is the language for the emails: "" when the user has no preferences,
// so the mailer uses its default.
func (u AuthUser) MailLanguage() string {
	if u.Language == nil {
		return ""
	}
	return *u.Language
}

// NewUser is an account to open, with its preferences and, for Google, its identity.
type NewUser struct {
	Email             string
	Name              string
	PhotoURL          *string
	PasswordHash      *string
	PasswordUpdatedAt *time.Time
	EmailVerifiedAt   *time.Time
	// Language is nil to keep the database default.
	Language *string
	Identity *NewIdentity
}

// NewIdentity links an outside account to a user.
type NewIdentity struct {
	Provider AuthProvider
	Subject  string
	Email    string
}

// SessionOrigin is where a request came from. Empty strings are stored as NULL.
type SessionOrigin struct {
	UserAgent string
	IP        string
}

// AuthSession is a refresh token row. A family is every session a device went through
// by rotating its refresh token.
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

// NewAuthSession is a session to store.
type NewAuthSession struct {
	UserID    string
	TokenHash string
	FamilyID  string
	ExpiresAt time.Time
	Origin    SessionOrigin
}

// AuthToken is an emailed token (verification, reset or invitation) with its user.
type AuthToken struct {
	ID        string
	UserID    string
	Purpose   AuthTokenPurpose
	ExpiresAt time.Time
	UsedAt    *time.Time
	User      AuthUser
}

// AuthIdentity is an outside account linked to a user.
type AuthIdentity struct {
	Provider  AuthProvider
	Subject   string
	Email     string
	CreatedAt time.Time
}

// AuthEventName is the name of AuthEventOccurred for the EventPublisher.
const AuthEventName = "auth.event"

// AuthEventOccurred is a line for the auth log. Empty strings are stored as NULL.
type AuthEventOccurred struct {
	Type      AuthEventType
	UserID    string
	Email     string
	SessionID string
	Origin    SessionOrigin
	Metadata  map[string]any
}

func (AuthEventOccurred) Name() string { return AuthEventName }

// AuthEventRecord is a line of the auth log as it is stored.
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

// GoogleIdentity is what a verified Google token says about the person.
type GoogleIdentity struct {
	Subject string
	Email   string
	Name    string
	Picture *string
}

// SessionClaims are the claims of the access token the request carried.
type SessionClaims struct {
	Sub string
	Sid string
}

// IssuedSession is a new session: the access token for the body and the refresh token
// for the cookie.
type IssuedSession struct {
	User             User
	SessionID        string
	AccessToken      string
	RefreshToken     string
	RefreshExpiresAt time.Time
}

// LinkedIdentity is an identity as GET /account sends it.
type LinkedIdentity struct {
	Provider AuthProvider `json:"provider"`
	Email    string       `json:"email"`
	LinkedAt Time         `json:"linkedAt"`
}

// AccountSummary is how a person can sign in (GET /account).
type AccountSummary struct {
	Email         string           `json:"email"`
	Name          string           `json:"name"`
	EmailVerified bool             `json:"emailVerified"`
	HasPassword   bool             `json:"hasPassword"`
	Identities    []LinkedIdentity `json:"identities"`
}

// AccountSession is one device signed in to the account (GET /account/sessions).
type AccountSession struct {
	ID         string  `json:"id"`
	Current    bool    `json:"current"`
	UserAgent  *string `json:"userAgent"`
	IP         *string `json:"ip"`
	CreatedAt  Time    `json:"createdAt"`
	LastUsedAt Time    `json:"lastUsedAt"`
	ExpiresAt  Time    `json:"expiresAt"`
}

// InviteSummary tells the invitation page who the invitation is for.
type InviteSummary struct {
	Email          string `json:"email"`
	Name           string `json:"name"`
	HasCredentials bool   `json:"hasCredentials"`
}

// PasswordResetSummary tells the reset page which address the link belongs to.
type PasswordResetSummary struct {
	Email string `json:"email"`
}

// InviteEmail is what the invitation email needs.
type InviteEmail struct {
	EstablishmentName string
	InviterName       string
	Token             string
}
