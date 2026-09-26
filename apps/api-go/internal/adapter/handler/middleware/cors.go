package middleware

import (
	"net/http"
	"slices"
)

const (
	corsAllowedMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
	corsAllowedHeaders = "Content-Type, Authorization, Last-Event-ID"
)

// CORS copies what @fastify/cors does with the options Nest passes it:
//   - every response carries "Vary: Origin" and "Access-Control-Allow-Credentials: true";
//   - Access-Control-Allow-Origin is only sent back to an origin on the list;
//   - every OPTIONS request is a preflight. Without Origin or
//     Access-Control-Request-Method it is a 400; otherwise a 204 with the allowed
//     methods and headers, whether the origin is allowed or not.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := w.Header()
			header.Add("Vary", "Origin")

			origin := r.Header.Get("Origin")
			if origin != "" && slices.Contains(allowedOrigins, origin) {
				header.Set("Access-Control-Allow-Origin", origin)
			}
			header.Set("Access-Control-Allow-Credentials", "true")

			if r.Method != http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			if origin == "" || r.Header.Get("Access-Control-Request-Method") == "" {
				header.Set("Content-Type", "text/plain; charset=utf-8")
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("Invalid Preflight Request"))
				return
			}

			header.Set("Access-Control-Allow-Methods", corsAllowedMethods)
			header.Set("Access-Control-Allow-Headers", corsAllowedHeaders)
			header.Set("Content-Length", "0")
			w.WriteHeader(http.StatusNoContent)
		})
	}
}
