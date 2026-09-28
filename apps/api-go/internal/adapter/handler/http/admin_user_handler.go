package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type AdminUserService interface {
	List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) (domain.Paginated[domain.AdminUserSummary], error)
	Detail(ctx context.Context, userID string) (domain.AdminUserDetail, error)
	Update(ctx context.Context, actorID, userID string, changes domain.AdminUserChanges) error
}

// AdminUserHandler is admin-users.controller.ts.
type AdminUserHandler struct {
	users AdminUserService
}

func NewAdminUserHandler(users AdminUserService) *AdminUserHandler {
	return &AdminUserHandler{users: users}
}

func (h *AdminUserHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /admin/users", h.list, middleware.Admin())
	handle(mux, guard, "GET /admin/users/{userId}", h.detail, middleware.Admin())
	handle(mux, guard, "PATCH /admin/users/{userId}", h.update, middleware.Admin())
}

// adminRoles are the platform roles an admin can filter by and give.
var adminRoles = []string{string(domain.RoleUser), string(domain.RoleAdmin)}

// updateAdminUserRequest is UpdateAdminUserDto.
type updateAdminUserRequest struct {
	Role   *string `json:"role" validate:"omitnil,oneof=USER ADMIN" msg:"oneof=INVALID_ROLE,type=INVALID_ROLE"`
	Active *bool   `json:"active" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

// list reads AdminUsersQueryDto.
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

	writeJSON(w, http.StatusOK, users)
}

func (h *AdminUserHandler) detail(w http.ResponseWriter, r *http.Request) {
	detail, err := h.users.Detail(r.Context(), r.PathValue("userId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, detail)
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
