package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type CashCloseHandler struct {
	closes ports.CashCloseService
}

func NewCashCloseHandler(closes ports.CashCloseService) *CashCloseHandler {
	return &CashCloseHandler{closes: closes}
}

func (h *CashCloseHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	orders := middleware.Modules(domain.ModuleOrders)

	handle(mux, guard, "GET /establishments/{establishmentId}/cash-closes", h.list,
		middleware.Permissions(domain.PermissionCloseCash), orders)
	handle(mux, guard, "GET /establishments/{establishmentId}/cash-closes/preview", h.preview,
		middleware.Permissions(domain.PermissionCloseCash), orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/cash-closes", h.closeCash,
		middleware.Permissions(domain.PermissionCloseCash), orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/cash-closes/{cashCloseId}/void", h.void,
		middleware.Permissions(domain.PermissionCloseCash), orders)
}

type closeCashRequest struct {
	OpeningFloat int     `json:"openingFloat" validate:"min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	CountedCash  int     `json:"countedCash" validate:"min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	Notes        *string `json:"notes" validate:"omitnil,max=500" msg:"max=MAX_LENGTH,type=INVALID_TYPE"`
}

func (h *CashCloseHandler) list(w http.ResponseWriter, r *http.Request) {
	closes, err := h.closes.List(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, closes)
}

func (h *CashCloseHandler) preview(w http.ResponseWriter, r *http.Request) {
	preview, err := h.closes.Preview(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, preview)
}

func (h *CashCloseHandler) closeCash(w http.ResponseWriter, r *http.Request) {
	var input closeCashRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	closed, err := h.closes.Close(r.Context(), r.PathValue("establishmentId"), middleware.CurrentUser(r.Context()).ID, domain.CloseCashInput{
		OpeningFloat: input.OpeningFloat,
		CountedCash:  input.CountedCash,
		Notes:        input.Notes,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, closed)
}

func (h *CashCloseHandler) void(w http.ResponseWriter, r *http.Request) {
	voided, err := h.closes.Void(r.Context(), r.PathValue("establishmentId"), r.PathValue("cashCloseId"), middleware.CurrentUser(r.Context()).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, voided)
}
