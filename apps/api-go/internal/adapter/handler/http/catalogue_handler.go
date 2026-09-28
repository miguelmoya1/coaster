package http

import (
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type CatalogueHandler struct {
	catalogue ports.CatalogueService
}

func NewCatalogueHandler(catalogue ports.CatalogueService) *CatalogueHandler {
	return &CatalogueHandler{catalogue: catalogue}
}

func (h *CatalogueHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	rules := []middleware.Rule{
		middleware.Permissions(domain.PermissionImportCatalogue),
		middleware.Modules(domain.ModuleInventory),
	}

	handle(mux, guard, "GET /establishments/{establishmentId}/catalogue", h.starter, rules...)
	handle(mux, guard, "POST /establishments/{establishmentId}/catalogue/import", h.importStarter, rules...)
}

type importCatalogueRequest struct {
	CategoryKeys *[]string `json:"categoryKeys" validate:"omitnil"`
}

func (h *CatalogueHandler) starter(w http.ResponseWriter, r *http.Request) {
	categories, err := h.catalogue.Starter(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, categories)
}

func (h *CatalogueHandler) importStarter(w http.ResponseWriter, r *http.Request) {
	var input importCatalogueRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	var keys []string
	if input.CategoryKeys != nil {
		keys = *input.CategoryKeys
	}

	if err := h.catalogue.Import(r.Context(), r.PathValue("establishmentId"), keys); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
