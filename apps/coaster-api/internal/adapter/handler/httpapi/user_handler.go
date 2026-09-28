package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type UserHandler struct {
	users ports.UserService
}

func NewUserHandler(users ports.UserService) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /users/me", h.me, middleware.OptionalAuth())
	handle(mux, guard, "PATCH /users/me", h.updateMe, middleware.RequireAuth())
}

type updateUserRequest struct {
	Name     *string `json:"name" validate:"omitnil" msg:"type=INVALID_TYPE"`
	PhotoURL *string `json:"photoUrl" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Language *string `json:"language" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

func (h *UserHandler) me(w http.ResponseWriter, r *http.Request) {
	respond.JSON(w, http.StatusOK, middleware.CurrentUser(r.Context()))
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
