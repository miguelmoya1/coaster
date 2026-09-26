package http

import (
	"net/http"
	"strings"

	"api-go/internal/adapter/handler/middleware"
)

// handle registers route ("POST /auth/login") under apiPrefix, behind the guard with its
// rules. Every route goes through here: see «Convenciones de P1» in MIGRACION.md.
func handle(mux *http.ServeMux, guard *middleware.Guard, route string, handler http.HandlerFunc, rules ...middleware.Rule) {
	method, path, _ := strings.Cut(route, " ")
	pattern := method + " " + apiPrefix + path

	mux.Handle(pattern, guard.Protect(pattern, handler, rules...))
}
