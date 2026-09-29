package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type TableHandler struct {
	tables ports.TableService
}

func NewTableHandler(tables ports.TableService) *TableHandler {
	return &TableHandler{tables: tables}
}

func (h *TableHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	orders := middleware.Modules(domain.ModuleOrders)

	handle(mux, guard, "GET /establishments/{establishmentId}/tables", h.list,
		middleware.Permissions(domain.PermissionViewTables), orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/tables", h.create,
		middleware.Permissions(domain.PermissionCreateTable), orders)
	handle(mux, guard, "PATCH /establishments/{establishmentId}/tables/{tableId}", h.update,
		middleware.Permissions(domain.PermissionUpdateTable), orders)
	handle(mux, guard, "DELETE /establishments/{establishmentId}/tables/{tableId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteTable), orders)
}

type createTableRequest struct {
	Name string `json:"name" validate:"required" msg:"required=REQUIRED,type=INVALID_TYPE"`
}

type updateTableRequest struct {
	Name *string `json:"name" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

func (h *TableHandler) list(w http.ResponseWriter, r *http.Request) {
	tables, err := h.tables.List(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, tables)
}

func (h *TableHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createTableRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.tables.Create(r.Context(), r.PathValue("establishmentId"), input.Name); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *TableHandler) update(w http.ResponseWriter, r *http.Request) {
	var input updateTableRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.tables.Update(r.Context(), r.PathValue("establishmentId"), r.PathValue("tableId"), input.Name); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}

func (h *TableHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.tables.Delete(r.Context(), r.PathValue("establishmentId"), r.PathValue("tableId")); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}
