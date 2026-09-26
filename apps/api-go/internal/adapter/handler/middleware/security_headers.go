package middleware

import "net/http"

// The headers @fastify/helmet sends with its default configuration.
var securityHeaders = map[string]string{
	"Content-Security-Policy":           "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
	"Cross-Origin-Opener-Policy":        "same-origin",
	"Cross-Origin-Resource-Policy":      "same-origin",
	"Origin-Agent-Cluster":              "?1",
	"Referrer-Policy":                   "no-referrer",
	"Strict-Transport-Security":         "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options":            "nosniff",
	"X-Dns-Prefetch-Control":            "off",
	"X-Download-Options":                "noopen",
	"X-Frame-Options":                   "SAMEORIGIN",
	"X-Permitted-Cross-Domain-Policies": "none",
	"X-Xss-Protection":                  "0",
}

// SecurityHeaders adds helmet's headers to every response, errors and preflights included.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		for name, value := range securityHeaders {
			header.Set(name, value)
		}

		next.ServeHTTP(w, r)
	})
}
