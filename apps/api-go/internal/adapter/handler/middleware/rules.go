package middleware

import (
	"time"

	"api-go/internal/core/domain"
)

// Rule is one check of a route, what a Nest decorator or @UseGuards says on a controller.
// Guard.Protect takes them.
type Rule func(*routeRules)

type authMode int

const (
	noAuth authMode = iota
	requiredAuth
	optionalAuth
)

type routeRules struct {
	auth             authMode
	admin            bool
	checkMembership  bool
	permissions      []domain.EstablishmentPermission
	modules          []domain.EstablishmentModule
	skipSubscription bool
	skipThrottle     bool
	limit            int
	ttl              time.Duration
}

// RequireAuth is @UseGuards(AuthGuard): a valid access token of an active user, or 401.
func RequireAuth() Rule {
	return func(r *routeRules) { r.auth = requiredAuth }
}

// OptionalAuth is @UseGuards(OptionalAuthGuard): the user when the token is good, and
// nobody otherwise.
func OptionalAuth() Rule {
	return func(r *routeRules) { r.auth = optionalAuth }
}

// Admin is @UseGuards(AuthGuard, AdminGuard) with @Admin(): only platform admins.
func Admin() Rule {
	return func(r *routeRules) {
		r.auth = requiredAuth
		r.admin = true
	}
}

// Permissions is @UseGuards(AuthGuard, EstablishmentPermissionsGuard) with
// @EstablishmentPermissions(...). The establishment is the {establishmentId} of the route.
// Without permissions it only asks for an active membership, as the guard does alone.
func Permissions(permissions ...domain.EstablishmentPermission) Rule {
	return func(r *routeRules) {
		r.auth = requiredAuth
		r.checkMembership = true
		r.permissions = permissions
	}
}

// Modules is EstablishmentModulesGuard with @EstablishmentModules(...): every module has to
// be on in the establishment of {establishmentId}.
func Modules(modules ...domain.EstablishmentModule) Rule {
	return func(r *routeRules) { r.modules = modules }
}

// SkipSubscriptionCheck is @SkipSubscriptionCheck(): writes go through even when the
// establishment's subscription has lapsed.
func SkipSubscriptionCheck() Rule {
	return func(r *routeRules) { r.skipSubscription = true }
}

// Throttle is @Throttle({ default: { limit, ttl } }): it replaces the global limit of
// 300 requests per minute for this route.
func Throttle(limit int, ttl time.Duration) Rule {
	return func(r *routeRules) {
		r.limit = limit
		r.ttl = ttl
	}
}

// SkipThrottle is @SkipThrottle(): the route has no rate limit.
func SkipThrottle() Rule {
	return func(r *routeRules) { r.skipThrottle = true }
}
