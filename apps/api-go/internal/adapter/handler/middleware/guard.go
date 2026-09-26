package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
	"api-go/internal/service"
)

// The global rate limit of app.module.ts: 300 requests per minute per route and address.
const (
	defaultLimit = 300
	defaultTTL   = time.Minute
)

// throttledMessage is the message of Nest's ThrottlerException.
const throttledMessage = "ThrottlerException: Too Many Requests"

// subscriptionManagementPath is where an establishment pays, which has to work while its
// subscription has lapsed.
var subscriptionManagementPath = regexp.MustCompile(`/establishments/[^/]+/establishment-subscription(/|$)`)

// CallerResolver reads the access token of a request (service.AccessTokenService).
type CallerResolver interface {
	Resolve(ctx context.Context, authorization string) (*service.Caller, error)
}

// AccessChecker answers the route checks (service.SecurityService).
type AccessChecker interface {
	UserRole(ctx context.Context, userID string) (domain.Role, error)
	Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error)
	EnabledModules(ctx context.Context, establishmentID string) ([]domain.EstablishmentModule, error)
	SubscriptionActive(ctx context.Context, establishmentID string) (bool, error)
}

// Guard runs, for each route, what Nest's guards do: the global rate limit and subscription
// check, then the route's own rules.
type Guard struct {
	tokens         CallerResolver
	access         AccessChecker
	limiter        ports.RateLimiter
	trustProxyHops int
}

func NewGuard(tokens CallerResolver, access AccessChecker, limiter ports.RateLimiter, trustProxyHops int) *Guard {
	return &Guard{tokens: tokens, access: access, limiter: limiter, trustProxyHops: trustProxyHops}
}

// Protect wraps the handler of the route pattern ("POST /api/v1/auth/login") with its rules.
// Every route goes through here, even without rules, because the rate limit and the
// subscription check are global in Nest. The checks run in Nest's order: rate limit,
// subscription, auth, admin, permissions and modules.
func (g *Guard) Protect(pattern string, handler http.Handler, rules ...Rule) http.Handler {
	route := routeRules{limit: defaultLimit, ttl: defaultTTL}
	for _, rule := range rules {
		rule(&route)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), clientIPKey, clientIP(r, g.trustProxyHops))

		if !route.skipThrottle && !g.throttle(ctx, w, pattern, route) {
			return
		}

		steps := []func(context.Context, *http.Request, routeRules) (context.Context, error){
			g.checkSubscription,
			g.authenticate,
			g.checkAdmin,
			g.checkPermissions,
			g.checkModules,
		}
		for _, step := range steps {
			next, err := step(ctx, r, route)
			if err != nil {
				WriteError(w, err)
				return
			}
			ctx = next
		}

		handler.ServeHTTP(w, r.WithContext(ctx))
	})
}

// throttle counts the request like ThrottlerGuard, with its headers, and answers 429 past
// the limit. The key is per route and address, as Nest's is per handler and address.
func (g *Guard) throttle(ctx context.Context, w http.ResponseWriter, pattern string, route routeRules) bool {
	sum := sha256.Sum256([]byte(pattern + "-default-" + ClientIP(ctx)))
	result := g.limiter.Hit(ctx, hex.EncodeToString(sum[:]), route.ttl, route.limit, route.ttl)

	if result.Blocked {
		w.Header().Set("Retry-After", strconv.Itoa(result.TimeToBlockExpire))
		WriteError(w, domain.TooManyRequests(throttledMessage))
		return false
	}

	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(route.limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(max(0, route.limit-result.TotalHits)))
	w.Header().Set("X-RateLimit-Reset", strconv.Itoa(result.TimeToExpire))

	return true
}

// checkSubscription is SubscriptionActiveGuard: a write on an establishment whose
// subscription has lapsed is a 402, unless a platform admin makes it.
func (g *Guard) checkSubscription(ctx context.Context, r *http.Request, route routeRules) (context.Context, error) {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return ctx, nil
	}

	establishmentID := r.PathValue("establishmentId")
	if route.skipSubscription || subscriptionManagementPath.MatchString(r.URL.Path) || establishmentID == "" {
		return ctx, nil
	}

	active, err := g.access.SubscriptionActive(ctx, establishmentID)
	if err != nil || active {
		return ctx, err
	}

	// The guard runs before the auth guard, so it reads the token itself.
	caller, err := g.tokens.Resolve(ctx, r.Header.Get("Authorization"))
	if err != nil {
		return ctx, err
	}
	if caller != nil && caller.User != nil && caller.User.Role == domain.RoleAdmin {
		return ctx, nil
	}

	return ctx, domain.PaymentRequired(domain.CodeSubscriptionExpired)
}

// authenticate is AuthGuard or OptionalAuthGuard. The session of the token is not looked
// up, as in Nest.
func (g *Guard) authenticate(ctx context.Context, r *http.Request, route routeRules) (context.Context, error) {
	if route.auth == noAuth {
		return ctx, nil
	}

	caller, err := g.tokens.Resolve(ctx, r.Header.Get("Authorization"))
	if err != nil {
		return ctx, err
	}

	signedIn := caller != nil && caller.User != nil && caller.User.Active

	if route.auth == optionalAuth {
		if signedIn {
			ctx = context.WithValue(ctx, userKey, caller.User)
		}
		return ctx, nil
	}

	if !signedIn {
		return ctx, domain.Unauthorized(domain.CodeInvalidCredentials)
	}

	return WithCurrentUser(ctx, caller.User, &caller.Claims), nil
}

// checkAdmin is AdminGuard, with the role read again through the cache.
func (g *Guard) checkAdmin(ctx context.Context, _ *http.Request, route routeRules) (context.Context, error) {
	if !route.admin {
		return ctx, nil
	}

	user := CurrentUser(ctx)
	if user == nil {
		return ctx, domain.Forbidden(domain.CodeUnauthorized)
	}

	role, err := g.access.UserRole(ctx, user.ID)
	if err != nil {
		return ctx, err
	}
	if role != domain.RoleAdmin {
		return ctx, domain.Forbidden(domain.CodeUnauthorized)
	}

	return ctx, nil
}

// checkPermissions is EstablishmentPermissionsGuard: the user has to be an active member of
// {establishmentId} with every permission the route asks for. A platform admin has them all.
func (g *Guard) checkPermissions(ctx context.Context, r *http.Request, route routeRules) (context.Context, error) {
	establishmentID := r.PathValue("establishmentId")
	if !route.checkMembership || (len(route.permissions) == 0 && establishmentID == "") {
		return ctx, nil
	}

	user := CurrentUser(ctx)
	if user == nil {
		return ctx, domain.Forbidden(domain.CodeUnauthorized)
	}

	role, err := g.access.UserRole(ctx, user.ID)
	if err != nil {
		return ctx, err
	}
	if role == domain.RoleAdmin {
		return context.WithValue(ctx, permissionsKey, slices.Clone(domain.AllEstablishmentPermissions)), nil
	}

	if establishmentID == "" {
		return ctx, domain.Forbidden(domain.CodeMissingEstablishmentId)
	}

	membership, err := g.access.Membership(ctx, user.ID, establishmentID)
	if err != nil {
		return ctx, err
	}
	if membership == nil || !membership.Active {
		return ctx, domain.Forbidden(domain.CodeMemberNotFound)
	}

	memberRole := domain.AsEstablishmentRole(membership.Role)
	ctx = context.WithValue(ctx, permissionsKey, domain.RolePermissions(memberRole))

	for _, permission := range route.permissions {
		if !domain.HasPermission(memberRole, permission) {
			return ctx, domain.Forbidden(domain.CodeUnauthorized)
		}
	}

	return ctx, nil
}

// checkModules is EstablishmentModulesGuard.
func (g *Guard) checkModules(ctx context.Context, r *http.Request, route routeRules) (context.Context, error) {
	establishmentID := r.PathValue("establishmentId")
	if len(route.modules) == 0 || establishmentID == "" {
		return ctx, nil
	}

	enabled, err := g.access.EnabledModules(ctx, establishmentID)
	if err != nil {
		return ctx, err
	}

	for _, module := range route.modules {
		if !slices.Contains(enabled, module) {
			return ctx, domain.Forbidden(domain.CodeModuleNotEnabled)
		}
	}

	return ctx, nil
}
