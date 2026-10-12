package middleware

import (
	"time"

	"coaster-api/internal/core/domain"
)

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

func RequireAuth() Rule {
	return func(r *routeRules) { r.auth = requiredAuth }
}

func OptionalAuth() Rule {
	return func(r *routeRules) { r.auth = optionalAuth }
}

func Admin() Rule {
	return func(r *routeRules) {
		r.auth = requiredAuth
		r.admin = true
	}
}

func Permissions(permissions ...domain.EstablishmentPermission) Rule {
	return func(r *routeRules) {
		r.auth = requiredAuth
		r.checkMembership = true
		r.permissions = permissions
	}
}

func Modules(modules ...domain.EstablishmentModule) Rule {
	return func(r *routeRules) { r.modules = modules }
}

func SkipSubscriptionCheck() Rule {
	return func(r *routeRules) { r.skipSubscription = true }
}

func Throttle(limit int, ttl time.Duration) Rule {
	return func(r *routeRules) {
		r.limit = limit
		r.ttl = ttl
	}
}

func SkipThrottle() Rule {
	return func(r *routeRules) { r.skipThrottle = true }
}
