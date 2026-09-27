package http

import (
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// UserHandler is users.controller.ts.
type UserHandler struct {
	users *service.UserService
}

func NewUserHandler(users *service.UserService) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /users/me", h.me, middleware.OptionalAuth())
	handle(mux, guard, "PATCH /users/me", h.updateMe, middleware.RequireAuth())
}

// updateUserRequest is UpdateUserDto.
type updateUserRequest struct {
	Name     *string `json:"name" validate:"omitnil" msg:"type=INVALID_TYPE"`
	PhotoURL *string `json:"photoUrl" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Language *string `json:"language" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

// me answers the signed-in user, or null when nobody is.
func (h *UserHandler) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, middleware.CurrentUser(r.Context()))
}

func (h *UserHandler) updateMe(w http.ResponseWriter, r *http.Request) {
	var input updateUserRequest
	nulls, err := decodeJSONWithNulls(r, &input)
	if err != nil {
		writeError(w, err)
		return
	}

	user := middleware.CurrentUser(r.Context())
	err = h.users.UpdateProfile(r.Context(), user.ID, domain.UserProfileChanges{
		Name:          input.Name,
		PhotoURL:      input.PhotoURL,
		ClearPhotoURL: nulls["photoUrl"],
		Language:      input.Language,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
