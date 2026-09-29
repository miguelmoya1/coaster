package middleware

import (
	"context"

	"coaster-api/internal/core/domain"
)

type contextKey int

const (
	userKey contextKey = iota
	sessionKey
	permissionsKey
	clientIPKey
)

func CurrentUser(ctx context.Context) *domain.User {
	user, _ := ctx.Value(userKey).(*domain.User)
	return user
}

func CurrentSession(ctx context.Context) *domain.SessionClaims {
	session, _ := ctx.Value(sessionKey).(*domain.SessionClaims)
	return session
}

func EstablishmentPermissionsOf(ctx context.Context) []domain.EstablishmentPermission {
	permissions, _ := ctx.Value(permissionsKey).([]domain.EstablishmentPermission)
	return permissions
}

func ClientIP(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey).(string)
	return ip
}

func WithCurrentUser(ctx context.Context, user *domain.User, session *domain.SessionClaims) context.Context {
	ctx = context.WithValue(ctx, userKey, user)
	return context.WithValue(ctx, sessionKey, session)
}
