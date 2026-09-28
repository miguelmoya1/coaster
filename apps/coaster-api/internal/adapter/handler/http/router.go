package http

import (
	"net/http"
	"path"
	"strings"

	"coaster-api/internal/adapter/handler/middleware"
)

const apiPrefix = "/api/v1"

type RouterConfig struct {
	CORSOrigins []string
	PublicDir   string
}

type Handlers struct {
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
	CashClose           *CashCloseHandler
	Stats               *StatsHandler
	Printer             *PrinterHandler
	PrinterConnection   *PrinterConnectionHandler
	AdminOverview       *AdminOverviewHandler
	AdminUser           *AdminUserHandler
	AdminBetaTester     *AdminBetaTesterHandler
	AdminEstablishment  *AdminEstablishmentHandler
	Order               *OrderHandler
	Table               *TableHandler
	AI                  *AIHandler
}

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
		handlers.CashClose.RegisterRoutes(mux, handlers.Guard)
		handlers.Stats.RegisterRoutes(mux, handlers.Guard)
		handlers.Printer.RegisterRoutes(mux, handlers.Guard)
		handlers.PrinterConnection.RegisterRoutes(mux, handlers.Guard)
		handlers.AdminOverview.RegisterRoutes(mux, handlers.Guard)
		handlers.AdminUser.RegisterRoutes(mux, handlers.Guard)
		handlers.AdminBetaTester.RegisterRoutes(mux, handlers.Guard)
		handlers.AdminEstablishment.RegisterRoutes(mux, handlers.Guard)
		handlers.Order.RegisterRoutes(mux, handlers.Guard)
		handlers.Table.RegisterRoutes(mux, handlers.Guard)
		handlers.AI.RegisterRoutes(mux, handlers.Guard)
	}

	return withGlobalMiddlewares(cfg, withNestNotFound(mux))
}

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

func withNestNotFound(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, pattern := mux.Handler(r); pattern == "" || !isCleanPath(r.URL.Path) {
			writeRouteNotFound(w, r)
			return
		}

		mux.ServeHTTP(w, r)
	})
}

func isCleanPath(p string) bool {
	clean := path.Clean(p)
	if strings.HasSuffix(p, "/") && clean != "/" {
		clean += "/"
	}
	return clean == p
}
