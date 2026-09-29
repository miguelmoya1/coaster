package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type AdminUserHandler struct {
	users ports.AdminUserService
}

func NewAdminUserHandler(users ports.AdminUserService) *AdminUserHandler {
	return &AdminUserHandler{users: users}
}

func (h *AdminUserHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /admin/users", h.list, middleware.Admin())
	handle(mux, guard, "GET /admin/users/{userId}", h.detail, middleware.Admin())
	handle(mux, guard, "PATCH /admin/users/{userId}", h.update, middleware.Admin())
}

var adminRoles = []string{string(domain.RoleUser), string(domain.RoleAdmin)}

type updateAdminUserRequest struct {
	Role   *string `json:"role" validate:"omitnil,oneof=USER ADMIN" msg:"oneof=INVALID_ROLE,type=INVALID_ROLE"`
	Active *bool   `json:"active" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

func (h *AdminUserHandler) list(w http.ResponseWriter, r *http.Request) {
	query := newAdminListQuery(r.URL.Query(), "q", "role", "active", "page", "pageSize")
	filter := domain.AdminUserFilter{
		Search: query.text("q", 120),
		Role:   domain.Role(query.oneOf("role", adminRoles, domain.CodeInvalidRole)),
		Active: query.boolean("active"),
	}
	page := query.page()
	if err := query.err(); err != nil {
		writeError(w, err)
		return
	}

	users, err := h.users.List(r.Context(), filter, page)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, users)
}

func (h *AdminUserHandler) detail(w http.ResponseWriter, r *http.Request) {
	detail, err := h.users.Detail(r.Context(), r.PathValue("userId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, detail)
}

func (h *AdminUserHandler) update(w http.ResponseWriter, r *http.Request) {
	var input updateAdminUserRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	changes := domain.AdminUserChanges{Active: input.Active}
	if input.Role != nil {
		role := domain.Role(*input.Role)
		changes.Role = &role
	}

	actor := middleware.CurrentUser(r.Context())
	if err := h.users.Update(r.Context(), actor.ID, r.PathValue("userId"), changes); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
