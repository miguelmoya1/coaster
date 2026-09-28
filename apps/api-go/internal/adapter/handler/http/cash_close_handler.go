package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

type CashCloseService interface {
	List(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	Preview(ctx context.Context, establishmentID string) (domain.CashClosePreview, error)
	Close(ctx context.Context, establishmentID, closedByID string, input service.CloseCashInput) (domain.CashClose, error)
}

type CashCloseHandler struct {
	closes CashCloseService
}

func NewCashCloseHandler(closes CashCloseService) *CashCloseHandler {
	return &CashCloseHandler{closes: closes}
}

func (h *CashCloseHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	orders := middleware.Modules(domain.ModuleOrders)

	handle(mux, guard, "GET /establishments/{establishmentId}/cash-closes", h.list,
		middleware.Permissions(domain.PermissionViewFinancials), orders)
	handle(mux, guard, "GET /establishments/{establishmentId}/cash-closes/preview", h.preview,
		middleware.Permissions(domain.PermissionCloseCash), orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/cash-closes", h.closeCash,
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

	writeJSON(w, http.StatusOK, closes)
}

func (h *CashCloseHandler) preview(w http.ResponseWriter, r *http.Request) {
	preview, err := h.closes.Preview(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, preview)
}

func (h *CashCloseHandler) closeCash(w http.ResponseWriter, r *http.Request) {
	var input closeCashRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	closed, err := h.closes.Close(r.Context(), r.PathValue("establishmentId"), middleware.CurrentUser(r.Context()).ID, service.CloseCashInput{
		OpeningFloat: input.OpeningFloat,
		CountedCash:  input.CountedCash,
		Notes:        input.Notes,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, closed)
}
