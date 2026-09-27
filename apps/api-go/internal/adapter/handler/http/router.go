package http

import (
	"net/http"
	"path"
	"strings"

	"api-go/internal/adapter/handler/middleware"
)

// apiPrefix is where every route lives, like Nest's global prefix and URI version.
const apiPrefix = "/api/v1"

// RouterConfig is what the router needs besides the handlers.
type RouterConfig struct {
	CORSOrigins []string
	PublicDir   string
}

// Handlers holds one handler per entity. Each package adds its field here and one line
// in NewRouter that registers its routes.
type Handlers struct {
	// Guard runs the rate limit and the route checks; every handler registers through it.
	Guard    *middleware.Guard
	Auth     *AuthHandler
	Account  *AccountHandler
	Realtime *RealtimeHandler

	EstablishmentSubscription *EstablishmentSubscriptionHandler
	StripeWebhook             *StripeWebhookHandler

	Category  *CategoryHandler
	Product   *ProductHandler
	Catalogue *CatalogueHandler
	Menu      *MenuHandler
	Media     *MediaHandler

	Shift         *ShiftHandler
	ShiftExchange *ShiftExchangeHandler
	TimeEntry     *TimeEntryHandler

	Establishment       *EstablishmentHandler
	User                *UserHandler
	EstablishmentMember *EstablishmentMemberHandler
}

// NewRouter registers every route under /api/v1 and wraps them in the global middlewares.
func NewRouter(cfg RouterConfig, handlers Handlers) (http.Handler, error) {
	mux := http.NewServeMux()

	mux.Handle("GET /public/", staticFiles(cfg.PublicDir))

	if handlers.Guard != nil {
		handlers.Auth.RegisterRoutes(mux, handlers.Guard)
		handlers.Account.RegisterRoutes(mux, handlers.Guard)
		handlers.Realtime.RegisterRoutes(mux, handlers.Guard)
		handlers.EstablishmentSubscription.RegisterRoutes(mux, handlers.Guard)
		handlers.StripeWebhook.RegisterRoutes(mux, handlers.Guard)
		handlers.Category.RegisterRoutes(mux, handlers.Guard)
		handlers.Product.RegisterRoutes(mux, handlers.Guard)
		handlers.Catalogue.RegisterRoutes(mux, handlers.Guard)
		handlers.Menu.RegisterRoutes(mux, handlers.Guard)
		handlers.Media.RegisterRoutes(mux, handlers.Guard)
		handlers.Shift.RegisterRoutes(mux, handlers.Guard)
		handlers.ShiftExchange.RegisterRoutes(mux, handlers.Guard)
		handlers.TimeEntry.RegisterRoutes(mux, handlers.Guard)
		handlers.Establishment.RegisterRoutes(mux, handlers.Guard)
		handlers.User.RegisterRoutes(mux, handlers.Guard)
		handlers.EstablishmentMember.RegisterRoutes(mux, handlers.Guard)
	}

	return withGlobalMiddlewares(cfg, withNestNotFound(mux))
}

// withGlobalMiddlewares wraps every request, from the outside in: helmet's headers, CORS,
// panic recovery and compression.
func withGlobalMiddlewares(cfg RouterConfig, handler http.Handler) (http.Handler, error) {
	handler, err := middleware.Compress(handler)
	if err != nil {
		return nil, err
	}

	handler = middleware.Recover(handler)
	handler = middleware.CORS(cfg.CORSOrigins)(handler)
	handler = middleware.SecurityHeaders(handler)

	return handler, nil
}

// withNestNotFound answers Nest's 404 for a route that does not exist. The standard mux would
// answer a plain-text 404, a 405 when only the method is wrong, or a redirect for a path like
// "/api/v1//orders"; Nest answers 404 to all of them.
func withNestNotFound(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, pattern := mux.Handler(r); pattern == "" || !isCleanPath(r.URL.Path) {
			writeRouteNotFound(w, r)
			return
		}

		mux.ServeHTTP(w, r)
	})
}

// isCleanPath reports whether the path has no "//", "." or ".." segments.
func isCleanPath(p string) bool {
	clean := path.Clean(p)
	if strings.HasSuffix(p, "/") && clean != "/" {
		clean += "/"
	}
	return clean == p
}
