package http

import (
	"errors"
	"io"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/service"
)

// StripeWebhookHandler is stripe-webhook.controller.ts: Stripe posts its events here.
type StripeWebhookHandler struct {
	subscriptions *service.SubscriptionService
}

func NewStripeWebhookHandler(subscriptions *service.SubscriptionService) *StripeWebhookHandler {
	return &StripeWebhookHandler{subscriptions: subscriptions}
}

func (h *StripeWebhookHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "POST /stripe/webhook", h.receive, middleware.SkipThrottle())
}

// receive needs the body exactly as it came, because the signature is computed over it.
func (h *StripeWebhookHandler) receive(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, &requestError{status: http.StatusRequestEntityTooLarge, message: messageBodyTooLarge})
			return
		}
		writeError(w, err)
		return
	}

	if err := h.subscriptions.HandleWebhook(r.Context(), payload, r.Header.Get("Stripe-Signature")); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]bool{"received": true})
}
