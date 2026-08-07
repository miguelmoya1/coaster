package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"printer-service/internal/domain"
	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

const MaxTicketBytes = 256 << 10

func NewPrintHandler(printUC *usecase.PrintTicketUseCase, renderer *escpos.Renderer) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed", nil)
			return
		}

		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxTicketBytes))
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeError(w, http.StatusRequestEntityTooLarge, "Ticket too large", err)
				return
			}
			writeError(w, http.StatusBadRequest, "Failed to read body", err)
			return
		}

		content := renderContent(renderer, body, r.Header.Get("Content-Type"))

		ticket := domain.Ticket{ID: "manual-print", Content: content}
		if err := printUC.Execute(r.Context(), ticket); err != nil {
			log.Printf("Print error: %v\n", err)
			writeError(w, http.StatusServiceUnavailable, "Could not print the ticket", err)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
}

func renderContent(renderer *escpos.Renderer, body []byte, contentType string) []byte {
	mediaType, _, _ := strings.Cut(contentType, ";")
	if strings.TrimSpace(mediaType) == "application/octet-stream" {
		return body
	}

	if payload, ok := escpos.TryParsePayload(body); ok {
		return renderer.Render(payload)
	}

	return renderer.RenderText(string(body))
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("Failed to write response: %v\n", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string, cause error) {
	body := map[string]string{"status": "error", "message": message}
	if cause != nil {
		body["details"] = cause.Error()
	}
	writeJSON(w, status, body)
}
