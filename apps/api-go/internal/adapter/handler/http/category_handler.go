package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type CategoryService interface {
	List(ctx context.Context, establishmentID string) ([]domain.Category, error)
	Create(ctx context.Context, establishmentID string, category domain.NewCategory) error
	Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) error
	Delete(ctx context.Context, establishmentID, categoryID string) error
}

type CategoryHandler struct {
	categories CategoryService
}

func NewCategoryHandler(categories CategoryService) *CategoryHandler {
	return &CategoryHandler{categories: categories}
}

func (h *CategoryHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	inventory := middleware.Modules(domain.ModuleInventory)

	handle(mux, guard, "GET /establishments/{establishmentId}/categories", h.list,
		middleware.Permissions(domain.PermissionViewCategories), inventory)
	handle(mux, guard, "POST /establishments/{establishmentId}/categories", h.create,
		middleware.Permissions(domain.PermissionCreateCategory), inventory)
	handle(mux, guard, "PATCH /establishments/{establishmentId}/categories/{categoryId}", h.update,
		middleware.Permissions(domain.PermissionUpdateCategory), inventory)
	handle(mux, guard, "DELETE /establishments/{establishmentId}/categories/{categoryId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteCategory), inventory)
}

type categoryRequest struct {
	Name    string  `json:"name" validate:"required" msg:"required=REQUIRED,type=INVALID_TYPE"`
	Icon    *string `json:"icon" validate:"omitnil" msg:"type=INVALID_TYPE"`
	TaxRate *int    `json:"taxRate" validate:"omitnil,min=0,max=10000" msg:"min=INVALID_TYPE,max=INVALID_TYPE,type=INVALID_TYPE"`
}

func (h *CategoryHandler) list(w http.ResponseWriter, r *http.Request) {
	categories, err := h.categories.List(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, categories)
}

func (h *CategoryHandler) create(w http.ResponseWriter, r *http.Request) {
	var input categoryRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.categories.Create(r.Context(), r.PathValue("establishmentId"), domain.NewCategory{
		Name:    input.Name,
		Icon:    input.Icon,
		TaxRate: input.TaxRate,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *CategoryHandler) update(w http.ResponseWriter, r *http.Request) {
	var input categoryRequest
	nulls, err := decodeJSONWithNulls(r, &input)
	if err != nil {
		writeError(w, err)
		return
	}

	err = h.categories.Update(r.Context(), r.PathValue("establishmentId"), r.PathValue("categoryId"), domain.CategoryChanges{
		Name:      input.Name,
		Icon:      input.Icon,
		ClearIcon: nulls["icon"],
		TaxRate:   input.TaxRate,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *CategoryHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.categories.Delete(r.Context(), r.PathValue("establishmentId"), r.PathValue("categoryId")); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}
