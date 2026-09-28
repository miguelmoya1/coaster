package httpapi

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

type RouteRegistrar interface {
	RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard)
}

func NewRouter(cfg RouterConfig, guard *middleware.Guard, handlers ...RouteRegistrar) (http.Handler, error) {
	mux := http.NewServeMux()

	mux.Handle("GET /public/", staticFiles(cfg.PublicDir))

	for _, handler := range handlers {
		handler.RegisterRoutes(mux, guard)
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
