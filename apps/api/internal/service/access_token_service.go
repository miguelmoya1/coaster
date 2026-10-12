package service

import (
	"context"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

const (
	accessTokenIssuer   = "coaster"
	accessTokenAudience = "coaster-api"
)

type AccessTokenService struct {
	secret []byte
	users  ports.AuthUserRepository
	cache  ports.Cache
	now    func() time.Time
}

func NewAccessTokenService(secret string, users ports.AuthUserRepository, cache ports.Cache) *AccessTokenService {
	return &AccessTokenService{secret: []byte(secret), users: users, cache: cache, now: time.Now}
}

type accessTokenClaims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

func (s *AccessTokenService) Sign(userID, sessionID string) (string, error) {
	now := s.now()

	claims := accessTokenClaims{
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    accessTokenIssuer,
			Audience:  jwt.ClaimStrings{accessTokenAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(domain.AccessTokenTTL)),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s *AccessTokenService) Verify(token string) *domain.SessionClaims {
	bearer := stripBearer(token)
	if bearer == "" {
		return nil
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(accessTokenIssuer),
		jwt.WithAudience(accessTokenAudience),
		jwt.WithTimeFunc(s.now),
	)

	var claims accessTokenClaims
	_, err := parser.ParseWithClaims(bearer, &claims, func(*jwt.Token) (any, error) {
		return s.secret, nil
	})
	if err != nil || claims.Subject == "" || claims.SessionID == "" {
		return nil
	}

	return &domain.SessionClaims{Sub: claims.Subject, Sid: claims.SessionID}
}

func (s *AccessTokenService) Resolve(ctx context.Context, token string) (*domain.Caller, error) {
	claims := s.Verify(token)
	if claims == nil {
		return nil, nil
	}

	cached, err := remember(ctx, s.cache, userCacheKey(claims.Sub), func() (*cachedUser, error) {
		user, err := s.users.FindByID(ctx, claims.Sub)
		if err != nil || user == nil {
			return nil, err
		}
		return newCachedUser(*user), nil
	})
	if err != nil {
		return nil, err
	}

	caller := &domain.Caller{Claims: *claims}
	if cached != nil {
		user := cached.toUser()
		caller.User = &user
	}

	return caller, nil
}

func stripBearer(value string) string {
	if len(value) >= 6 && strings.EqualFold(value[:6], "bearer") {
		rest := value[6:]
		trimmed := strings.TrimLeft(rest, " \t\r\n")
		if trimmed != rest {
			return trimmed
		}
	}
	return value
}

type cachedUser struct {
	ID              string             `json:"id"`
	Email           string             `json:"email"`
	Name            string             `json:"name"`
	PhotoURL        *string            `json:"photoUrl"`
	Active          bool               `json:"active"`
	Role            domain.Role        `json:"role"`
	EmailVerifiedAt *domain.Time       `json:"emailVerifiedAt"`
	Preferences     *cachedPreferences `json:"preferences"`
}

type cachedPreferences struct {
	Language string `json:"language"`
}

func newCachedUser(user domain.AuthUser) *cachedUser {
	cached := &cachedUser{
		ID:       user.ID,
		Email:    user.Email,
		Name:     user.Name,
		PhotoURL: user.PhotoURL,
		Active:   user.Active,
		Role:     user.Role,
	}

	cached.EmailVerifiedAt = domain.OptionalTime(user.EmailVerifiedAt)
	if user.Language != nil {
		cached.Preferences = &cachedPreferences{Language: *user.Language}
	}

	return cached
}

func (c cachedUser) toUser() domain.User {
	user := domain.AuthUser{
		ID:       c.ID,
		Email:    c.Email,
		Name:     c.Name,
		PhotoURL: c.PhotoURL,
		Active:   c.Active,
		Role:     c.Role,
	}

	if c.EmailVerifiedAt != nil {
		user.EmailVerifiedAt = &c.EmailVerifiedAt.Time
	}
	if c.Preferences != nil {
		user.Language = &c.Preferences.Language
	}

	return user.ToUser()
}
