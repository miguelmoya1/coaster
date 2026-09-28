package http

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/ports"
)

type AdminBetaTesterHandler struct {
	testers ports.BetaTesterService
}

func NewAdminBetaTesterHandler(testers ports.BetaTesterService) *AdminBetaTesterHandler {
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
