package httpapi

import (
	"encoding/json"
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type EstablishmentSubscriptionHandler struct {
	subscriptions ports.SubscriptionService
}

func NewEstablishmentSubscriptionHandler(subscriptions ports.SubscriptionService) *EstablishmentSubscriptionHandler {
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

type createCustomerPortalSessionRequest struct {
	Underscore *json.RawMessage `json:"_" validate:"omitnil"`
}

func (h *EstablishmentSubscriptionHandler) find(w http.ResponseWriter, r *http.Request) {
	subscription, err := h.subscriptions.Find(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, subscription)
}

func (h *EstablishmentSubscriptionHandler) seats(w http.ResponseWriter, r *http.Request) {
	seats, err := h.subscriptions.Seats(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, seats)
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

	respond.JSON(w, http.StatusCreated, session)
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

	respond.JSON(w, http.StatusCreated, session)
}
