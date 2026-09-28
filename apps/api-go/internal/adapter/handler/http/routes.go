package http

import (
	"net/http"
	"strings"

	"api-go/internal/adapter/handler/middleware"
)

func handle(mux *http.ServeMux, guard *middleware.Guard, route string, handler http.HandlerFunc, rules ...middleware.Rule) {
	method, path, _ := strings.Cut(route, " ")
	pattern := method + " " + apiPrefix + path

	mux.Handle(pattern, guard.Protect(pattern, handler, rules...))
}
