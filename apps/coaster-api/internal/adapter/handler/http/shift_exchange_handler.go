package http

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type ShiftExchangeHandler struct {
	exchanges ports.ShiftExchangeService
}

func NewShiftExchangeHandler(exchanges ports.ShiftExchangeService) *ShiftExchangeHandler {
	return &ShiftExchangeHandler{exchanges: exchanges}
}

func (h *ShiftExchangeHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/exchanges", h.list,
		middleware.Permissions(domain.PermissionViewExchanges))
	handle(mux, guard, "POST /establishments/{establishmentId}/shifts/{shiftId}/exchanges", h.request,
		middleware.Permissions(domain.PermissionCreateExchange))
	handle(mux, guard, "PATCH /establishments/{establishmentId}/exchanges/{exchangeId}/accept", h.accept,
		middleware.Permissions(domain.PermissionAcceptExchange))
	handle(mux, guard, "DELETE /establishments/{establishmentId}/exchanges/{exchangeId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteExchange))
}

type createShiftExchangeRequest struct {
	TargetID *string `json:"targetId" validate:"omitnil,uuid4" msg:"uuid4=INVALID_TYPE,type=INVALID_TYPE"`
}

func (h *ShiftExchangeHandler) list(w http.ResponseWriter, r *http.Request) {
	exchanges, err := h.exchanges.ListPending(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, exchanges)
}

func (h *ShiftExchangeHandler) request(w http.ResponseWriter, r *http.Request) {
	var input createShiftExchangeRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	err := h.exchanges.Request(ctx, r.PathValue("establishmentId"), r.PathValue("shiftId"), middleware.CurrentUser(ctx).ID, input.TargetID)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *ShiftExchangeHandler) accept(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	err := h.exchanges.Accept(ctx, r.PathValue("establishmentId"), r.PathValue("exchangeId"), middleware.CurrentUser(ctx).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *ShiftExchangeHandler) delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	err := h.exchanges.Delete(ctx, r.PathValue("establishmentId"), r.PathValue("exchangeId"), middleware.CurrentUser(ctx).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
