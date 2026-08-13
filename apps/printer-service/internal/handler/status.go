package handler

import (
	"context"
	"net/http"
	"time"

	"printer-service/internal/infrastructure/printer"
)

const discoveryTimeout = 30 * time.Second

func NewHealthHandler(version, establishmentID, printerTarget string) http.Handler {
	started := time.Now()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed", nil)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"status":          "ok",
			"version":         version,
			"establishmentId": establishmentID,
			"printer":         printerTarget,
			"uptime":          time.Since(started).Round(time.Second).String(),
		})
	})
}

func NewDisabledHandler(reason string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusServiceUnavailable, reason, nil)
	})
}

func NewDiscoveryHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed", nil)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), discoveryTimeout)
		defer cancel()

		found := printer.Discover(ctx)
		if found == nil {
			found = []printer.Discovered{}
		}

		writeJSON(w, http.StatusOK, map[string]any{"printers": found})
	})
}
