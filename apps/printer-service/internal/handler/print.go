package handler

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"printer-service/internal/domain"
	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

func NewPrintHandler(printUC *usecase.PrintTicketUseCase) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}

	
		var content []byte
		if payload, ok := escpos.TryParsePayload(body); ok {
			content = escpos.RenderTicket(payload)
		} else {
		
			content = body
		}

		ticket := domain.Ticket{
			ID:      "manual-print",
			Content: content,
		}

		if err := printUC.Execute(context.Background(), ticket); err != nil {
			log.Printf("Print error: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Could not connect to printer",
				"details": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
}
