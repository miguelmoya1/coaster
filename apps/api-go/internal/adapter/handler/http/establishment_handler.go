package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type EstablishmentService interface {
	Create(ctx context.Context, owner domain.User, name string) error
	ListFor(ctx context.Context, userID string) ([]domain.Establishment, error)
	Get(ctx context.Context, establishmentID string) (*domain.Establishment, error)
	Settings(ctx context.Context, establishmentID string) (domain.EstablishmentSettings, error)
	UpdateSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error)
}

type EstablishmentHandler struct {
	establishments EstablishmentService
}

func NewEstablishmentHandler(establishments EstablishmentService) *EstablishmentHandler {
	return &EstablishmentHandler{establishments: establishments}
}

func (h *EstablishmentHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "POST /establishments", h.create, middleware.Permissions())
	handle(mux, guard, "GET /establishments", h.list, middleware.Permissions())
	handle(mux, guard, "GET /establishments/{establishmentId}/settings", h.settings, middleware.Permissions())
	handle(mux, guard, "PATCH /establishments/{establishmentId}/settings", h.updateSettings,
		middleware.Permissions(domain.PermissionManageSettings))
	handle(mux, guard, "GET /establishments/{establishmentId}", h.get, middleware.Permissions())
}

type createEstablishmentRequest struct {
	Name string `json:"name" validate:"required,min=3,max=50" msg:"required=REQUIRED,min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
}

type updateEstablishmentSettingsRequest struct {
	Modules     []domain.EstablishmentModule `json:"modules" validate:"unique,dive,oneof=TIME_TRACKING ORDERS INVENTORY" msg:"oneof=INVALID_TYPE"`
	Language    *string                      `json:"language" validate:"omitnil,oneof=es en" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	MarkSoldOut *bool                        `json:"markSoldOut" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

func (h *EstablishmentHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createEstablishmentRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	user := middleware.CurrentUser(r.Context())
	if err := h.establishments.Create(r.Context(), *user, input.Name); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *EstablishmentHandler) list(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())

	establishments, err := h.establishments.ListFor(r.Context(), user.ID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, establishments)
}

func (h *EstablishmentHandler) get(w http.ResponseWriter, r *http.Request) {
	establishment, err := h.establishments.Get(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, establishment)
}

func (h *EstablishmentHandler) settings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.establishments.Settings(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, settings)
}

func (h *EstablishmentHandler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var input updateEstablishmentSettingsRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	settings, err := h.establishments.UpdateSettings(r.Context(), r.PathValue("establishmentId"), domain.EstablishmentSettingsChanges{
		Modules:     input.Modules,
		Language:    input.Language,
		MarkSoldOut: input.MarkSoldOut,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, settings)
}
