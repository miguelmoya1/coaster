package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type BetaTesterService interface {
	List(ctx context.Context, search string, page domain.PageRequest) (domain.AdminBetaTesters, error)
	Add(ctx context.Context, actorID, email string, note *string) error
	Remove(ctx context.Context, actorID, betaTesterID string) error
}

type AdminBetaTesterHandler struct {
	testers BetaTesterService
}

func NewAdminBetaTesterHandler(testers BetaTesterService) *AdminBetaTesterHandler {
	return &AdminBetaTesterHandler{testers: testers}
}

func (h *AdminBetaTesterHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /admin/beta-testers", h.list, middleware.Admin())
	handle(mux, guard, "POST /admin/beta-testers", h.add, middleware.Admin())
	handle(mux, guard, "DELETE /admin/beta-testers/{betaTesterId}", h.remove, middleware.Admin())
}

type addBetaTesterRequest struct {
	Email string  `json:"email" validate:"email,max=320" msg:"email=INVALID_EMAIL,max=MAX_LENGTH,type=INVALID_EMAIL"`
	Note  *string `json:"note" validate:"omitnil,max=200" msg:"max=MAX_LENGTH,type=INVALID_TYPE"`
}

func (h *AdminBetaTesterHandler) list(w http.ResponseWriter, r *http.Request) {
	query := newAdminListQuery(r.URL.Query(), "q", "page", "pageSize")
	search := query.text("q", 120)
	page := query.page()
	if err := query.err(); err != nil {
		writeError(w, err)
		return
	}

	testers, err := h.testers.List(r.Context(), search, page)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, testers)
}

func (h *AdminBetaTesterHandler) add(w http.ResponseWriter, r *http.Request) {
	var input addBetaTesterRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	actor := middleware.CurrentUser(r.Context())
	if err := h.testers.Add(r.Context(), actor.ID, input.Email, input.Note); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminBetaTesterHandler) remove(w http.ResponseWriter, r *http.Request) {
	actor := middleware.CurrentUser(r.Context())
	if err := h.testers.Remove(r.Context(), actor.ID, r.PathValue("betaTesterId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
