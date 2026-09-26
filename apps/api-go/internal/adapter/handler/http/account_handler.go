package http

import (
	"context"
	"net/http"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// AccountService is what AccountHandler needs (service.AccountService).
type AccountService interface {
	Account(ctx context.Context, userID string) (domain.AccountSummary, error)
	RequestEmailVerification(ctx context.Context, userID string) error
	SetPassword(ctx context.Context, input service.SetPasswordInput, origin domain.SessionOrigin) error
	Sessions(ctx context.Context, userID, currentSessionID string) ([]domain.AccountSession, error)
	CloseOtherSessions(ctx context.Context, userID, currentSessionID string) error
	CloseSession(ctx context.Context, userID, sessionID, currentSessionID string) error
	UnlinkIdentity(ctx context.Context, userID string, provider domain.AuthProvider, origin domain.SessionOrigin) error
}

// AccountHandler is account.controller.ts: how the signed-in person signs in.
type AccountHandler struct {
	account AccountService
}

func NewAccountHandler(account AccountService) *AccountHandler {
	return &AccountHandler{account: account}
}

func (h *AccountHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /account", h.summary, middleware.RequireAuth())
	handle(mux, guard, "POST /account/verify-email", h.requestVerification, middleware.RequireAuth(), middleware.Throttle(3, time.Minute))
	handle(mux, guard, "PUT /account/password", h.setPassword, middleware.RequireAuth(), middleware.Throttle(5, time.Minute))
	handle(mux, guard, "GET /account/sessions", h.sessions, middleware.RequireAuth())
	handle(mux, guard, "DELETE /account/sessions", h.closeOtherSessions, middleware.RequireAuth())
	handle(mux, guard, "DELETE /account/sessions/{id}", h.closeSession, middleware.RequireAuth())
	handle(mux, guard, "DELETE /account/identities/{provider}", h.unlink, middleware.RequireAuth())
}

type setPasswordRequest struct {
	Password        string  `json:"password" validate:"min=8,max=128" msg:"type=password must be longer than or equal to 8 characters"`
	CurrentPassword *string `json:"currentPassword" validate:"omitnil,max=128"`
}

func (h *AccountHandler) summary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.account.Account(r.Context(), middleware.CurrentUser(r.Context()).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *AccountHandler) requestVerification(w http.ResponseWriter, r *http.Request) {
	if err := h.account.RequestEmailVerification(r.Context(), middleware.CurrentUser(r.Context()).ID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AccountHandler) setPassword(w http.ResponseWriter, r *http.Request) {
	var input setPasswordRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	current := ""
	if input.CurrentPassword != nil {
		current = *input.CurrentPassword
	}

	err := h.account.SetPassword(r.Context(), service.SetPasswordInput{
		UserID:          middleware.CurrentUser(r.Context()).ID,
		SessionID:       middleware.CurrentSession(r.Context()).Sid,
		Password:        input.Password,
		CurrentPassword: current,
	}, originOf(r))
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AccountHandler) sessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	sessions, err := h.account.Sessions(ctx, middleware.CurrentUser(ctx).ID, middleware.CurrentSession(ctx).Sid)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, sessions)
}

func (h *AccountHandler) closeOtherSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := h.account.CloseOtherSessions(ctx, middleware.CurrentUser(ctx).ID, middleware.CurrentSession(ctx).Sid); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AccountHandler) closeSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	err := h.account.CloseSession(ctx, middleware.CurrentUser(ctx).ID, r.PathValue("id"), middleware.CurrentSession(ctx).Sid)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AccountHandler) unlink(w http.ResponseWriter, r *http.Request) {
	provider := domain.AuthProvider(r.PathValue("provider"))
	if provider != domain.AuthProviderGoogle {
		// Nest's ParseEnumPipe.
		middleware.WriteNestError(w, http.StatusBadRequest, "Validation failed (enum string is expected)")
		return
	}

	if err := h.account.UnlinkIdentity(r.Context(), middleware.CurrentUser(r.Context()).ID, provider, originOf(r)); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
