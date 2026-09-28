package middleware

import (
	"net"
	"net/http"
	"strings"
)

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
