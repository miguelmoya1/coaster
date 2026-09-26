package middleware

import (
	"net"
	"net/http"
	"strings"
)

// clientIP copies Fastify's trustProxy with a number of hops: the socket address counts as
// hop 0, then X-Forwarded-For from right to left, and the address hops steps away wins.
// With 0 hops X-Forwarded-For is ignored.
func clientIP(r *http.Request, trustProxyHops int) string {
	socket, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		socket = r.RemoteAddr
	}

	if trustProxyHops <= 0 {
		return socket
	}

	addresses := []string{socket}
	forwarded := strings.Split(strings.Join(r.Header.Values("X-Forwarded-For"), ","), ",")
	for i := len(forwarded) - 1; i >= 0; i-- {
		if address := strings.TrimSpace(forwarded[i]); address != "" {
			addresses = append(addresses, address)
		}
	}

	return addresses[min(trustProxyHops, len(addresses)-1)]
}
