package http

import (
	"context"
	"encoding/json"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type EstablishmentSubscriptionService interface {
	Find(ctx context.Context, establishmentID string) (domain.EstablishmentSubscriptionView, error)
	Seats(ctx context.Context, establishmentID string) (domain.SubscriptionSeats, error)
	CreateCheckoutSession(ctx context.Context, establishmentID string, plan domain.SubscriptionPlan) (domain.CheckoutSession, error)
	CreateCustomerPortalSession(ctx context.Context, establishmentID string) (domain.PortalSession, error)
}

// EstablishmentSubscriptionHandler is establishment-subscription.controller.ts.
type EstablishmentSubscriptionHandler struct {
	subscriptions EstablishmentSubscriptionService
}

func NewEstablishmentSubscriptionHandler(subscriptions EstablishmentSubscriptionService) *EstablishmentSubscriptionHandler {
	return &EstablishmentSubscriptionHandler{subscriptions: subscriptions}
}

func (h *EstablishmentSubscriptionHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	const base = "/establishments/{establishmentId}/establishment-subscription"

	handle(mux, guard, "GET "+base, h.find, middleware.Permissions())
	handle(mux, guard, "GET "+base+"/seats", h.seats, middleware.Permissions())
	handle(mux, guard, "POST "+base+"/checkout-session", h.createCheckoutSession,
		middleware.Permissions(domain.PermissionManageBilling))
	handle(mux, guard, "POST "+base+"/customer-portal-session", h.createCustomerPortalSession,
		middleware.Permissions(domain.PermissionManageBilling))
}

type createCheckoutSessionRequest struct {
	Plan *string `json:"plan" validate:"omitnil,oneof=PRO" msg:"oneof=INVALID_SUBSCRIPTION_PLAN,type=INVALID_SUBSCRIPTION_PLAN"`
}

// createCustomerPortalSessionRequest carries nothing. The DTO in Nest declares an optional
// "_", so that is the only property it does not refuse.
type createCustomerPortalSessionRequest struct {
	Underscore *json.RawMessage `json:"_" validate:"omitnil"`
}

func (h *EstablishmentSubscriptionHandler) find(w http.ResponseWriter, r *http.Request) {
	subscription, err := h.subscriptions.Find(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, subscription)
}

func (h *EstablishmentSubscriptionHandler) seats(w http.ResponseWriter, r *http.Request) {
	seats, err := h.subscriptions.Seats(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, seats)
}

func (h *EstablishmentSubscriptionHandler) createCheckoutSession(w http.ResponseWriter, r *http.Request) {
	var input createCheckoutSessionRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	plan := domain.PlanPro
	if input.Plan != nil {
		plan = domain.SubscriptionPlan(*input.Plan)
	}

	session, err := h.subscriptions.CreateCheckoutSession(r.Context(), r.PathValue("establishmentId"), plan)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, session)
}

func (h *EstablishmentSubscriptionHandler) createCustomerPortalSession(w http.ResponseWriter, r *http.Request) {
	var input createCustomerPortalSessionRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	session, err := h.subscriptions.CreateCustomerPortalSession(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, session)
}
