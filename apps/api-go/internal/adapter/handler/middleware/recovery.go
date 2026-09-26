package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recover turns a panic in a handler into Nest's generic 500 and logs it.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			recovered := recover()
			if recovered == nil {
				return
			}

			// net/http uses this panic to abort a response on purpose.
			if recovered == http.ErrAbortHandler {
				panic(recovered)
			}

			slog.Error("panic while handling a request",
				"method", r.Method,
				"path", r.URL.Path,
				"panic", recovered,
				"stack", string(debug.Stack()),
			)

			WriteInternalServerError(w)
		}()

		next.ServeHTTP(w, r)
	})
}
