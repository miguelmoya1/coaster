package middleware

import (
	"context"

	"api-go/internal/core/domain"
)

// What Guard.Protect leaves in the request context for the handler.

type contextKey int

const (
	userKey contextKey = iota
	sessionKey
	permissionsKey
	clientIPKey
)

// CurrentUser is the signed-in user (@CurrentUser in Nest), or nil when the route has
// OptionalAuth and nobody is signed in.
func CurrentUser(ctx context.Context) *domain.User {
	user, _ := ctx.Value(userKey).(*domain.User)
	return user
}

// CurrentSession is the claims of the access token (@CurrentSession in Nest). Only routes
// with RequireAuth, Admin or Permissions have one.
func CurrentSession(ctx context.Context) *domain.SessionClaims {
	session, _ := ctx.Value(sessionKey).(*domain.SessionClaims)
	return session
}

// EstablishmentPermissionsOf is what the user may do in the establishment of the route
// (@EstablishmentPermissionsOf in Nest): every permission for a platform admin, those of the
// membership's role otherwise, and none on routes without Permissions.
func EstablishmentPermissionsOf(ctx context.Context) []domain.EstablishmentPermission {
	permissions, _ := ctx.Value(permissionsKey).([]domain.EstablishmentPermission)
	return permissions
}

// ClientIP is the caller's address (request.ip in Nest), read with TRUST_PROXY_HOPS.
func ClientIP(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey).(string)
	return ip
}

// WithCurrentUser returns ctx with user and session, for handler tests.
func WithCurrentUser(ctx context.Context, user *domain.User, session *domain.SessionClaims) context.Context {
	ctx = context.WithValue(ctx, userKey, user)
	return context.WithValue(ctx, sessionKey, session)
}
