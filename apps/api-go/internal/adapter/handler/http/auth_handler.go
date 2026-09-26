package http

import (
	"context"
	"net/http"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// The refresh token cookie, the same as REFRESH_COOKIE_NAME and REFRESH_COOKIE_PATH in Nest.
const (
	refreshCookieName = "coaster_session"
	refreshCookiePath = "/api/v1/auth"
)

// AuthService is what AuthHandler needs (service.AuthService).
type AuthService interface {
	Register(ctx context.Context, input service.RegisterInput, origin domain.SessionOrigin) (domain.IssuedSession, error)
	LoginWithPassword(ctx context.Context, email, password string, origin domain.SessionOrigin) (domain.IssuedSession, error)
	LoginWithGoogle(ctx context.Context, credential string, origin domain.SessionOrigin) (domain.IssuedSession, error)
	Refresh(ctx context.Context, refreshToken string, origin domain.SessionOrigin) (domain.IssuedSession, error)
	Logout(ctx context.Context, refreshToken string, origin domain.SessionOrigin) error
	LogoutEverywhere(ctx context.Context, userID string, origin domain.SessionOrigin) error
	RequestPasswordReset(ctx context.Context, email string) error
	PasswordReset(ctx context.Context, token string) (domain.PasswordResetSummary, error)
	ResetPassword(ctx context.Context, token, password string, origin domain.SessionOrigin) (domain.IssuedSession, error)
	VerifyEmail(ctx context.Context, token string) error
	Invite(ctx context.Context, token string) (domain.InviteSummary, error)
	AcceptInvite(ctx context.Context, token, password string, origin domain.SessionOrigin) (domain.IssuedSession, error)
}

// AuthHandler is auth.controller.ts: signing in and out, and the emailed links.
type AuthHandler struct {
	auth         AuthService
	secureCookie bool
}

func NewAuthHandler(auth AuthService, isProduction bool) *AuthHandler {
	return &AuthHandler{auth: auth, secureCookie: isProduction}
}

func (h *AuthHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "POST /auth/register", h.register, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "POST /auth/login", h.login, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "POST /auth/google", h.google, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "POST /auth/refresh", h.refresh, middleware.Throttle(60, time.Minute))
	handle(mux, guard, "POST /auth/forgot-password", h.forgotPassword, middleware.Throttle(5, time.Minute))
	handle(mux, guard, "POST /auth/reset-password", h.resetPassword, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "GET /auth/reset-password/{token}", h.passwordReset, middleware.Throttle(20, time.Minute))
	handle(mux, guard, "POST /auth/verify-email", h.verifyEmail, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "GET /auth/invite/{token}", h.invite, middleware.Throttle(20, time.Minute))
	handle(mux, guard, "POST /auth/invite", h.acceptInvite, middleware.Throttle(10, time.Minute))
	handle(mux, guard, "POST /auth/logout", h.logout)
	handle(mux, guard, "POST /auth/logout-everywhere", h.logoutEverywhere, middleware.RequireAuth())
}

// The request bodies, with the rules of the DTOs in apps/api/src/auth/dto.

type registerRequest struct {
	Email    string  `json:"email" validate:"email" msg:"type=email must be an email"`
	Password string  `json:"password" validate:"min=8,max=128" msg:"type=password must be longer than or equal to 8 characters"`
	Name     string  `json:"name" validate:"required,max=120"`
	Language *string `json:"language" validate:"omitnil,min=2,max=5"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"email" msg:"type=email must be an email"`
	Password string `json:"password" validate:"required,max=128"`
}

type googleLoginRequest struct {
	Credential string `json:"credential" validate:"required,max=4096"`
}

type emailRequest struct {
	Email string `json:"email" validate:"email" msg:"type=email must be an email"`
}

type tokenRequest struct {
	Token string `json:"token" validate:"required,max=256"`
}

type tokenWithPasswordRequest struct {
	Token    string `json:"token" validate:"required,max=256"`
	Password string `json:"password" validate:"min=8,max=128" msg:"type=password must be longer than or equal to 8 characters"`
}

// authSessionResponse is AuthSession of @coaster/common.
type authSessionResponse struct {
	User        domain.User `json:"user"`
	AccessToken string      `json:"accessToken"`
	ExpiresIn   int         `json:"expiresIn"`
}

func (h *AuthHandler) register(w http.ResponseWriter, r *http.Request) {
	var input registerRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	issued, err := h.auth.Register(r.Context(), service.RegisterInput{
		Email:    input.Email,
		Password: input.Password,
		Name:     input.Name,
		Language: input.Language,
	}, originOf(r))
	h.respond(w, http.StatusCreated, issued, err)
}

func (h *AuthHandler) login(w http.ResponseWriter, r *http.Request) {
	var input loginRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	issued, err := h.auth.LoginWithPassword(r.Context(), input.Email, input.Password, originOf(r))
	h.respond(w, http.StatusOK, issued, err)
}

func (h *AuthHandler) google(w http.ResponseWriter, r *http.Request) {
	var input googleLoginRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	issued, err := h.auth.LoginWithGoogle(r.Context(), input.Credential, originOf(r))
	h.respond(w, http.StatusOK, issued, err)
}

func (h *AuthHandler) refresh(w http.ResponseWriter, r *http.Request) {
	issued, err := h.auth.Refresh(r.Context(), refreshTokenOf(r), originOf(r))
	h.respond(w, http.StatusOK, issued, err)
}

func (h *AuthHandler) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var input emailRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.auth.RequestPasswordReset(r.Context(), input.Email); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) resetPassword(w http.ResponseWriter, r *http.Request) {
	var input tokenWithPasswordRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	issued, err := h.auth.ResetPassword(r.Context(), input.Token, input.Password, originOf(r))
	h.respond(w, http.StatusOK, issued, err)
}

func (h *AuthHandler) passwordReset(w http.ResponseWriter, r *http.Request) {
	summary, err := h.auth.PasswordReset(r.Context(), r.PathValue("token"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *AuthHandler) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var input tokenRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.auth.VerifyEmail(r.Context(), input.Token); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) invite(w http.ResponseWriter, r *http.Request) {
	summary, err := h.auth.Invite(r.Context(), r.PathValue("token"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *AuthHandler) acceptInvite(w http.ResponseWriter, r *http.Request) {
	var input tokenWithPasswordRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	issued, err := h.auth.AcceptInvite(r.Context(), input.Token, input.Password, originOf(r))
	h.respond(w, http.StatusOK, issued, err)
}

func (h *AuthHandler) logout(w http.ResponseWriter, r *http.Request) {
	if err := h.auth.Logout(r.Context(), refreshTokenOf(r), originOf(r)); err != nil {
		writeError(w, err)
		return
	}

	clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) logoutEverywhere(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())

	if err := h.auth.LogoutEverywhere(r.Context(), user.ID, originOf(r)); err != nil {
		writeError(w, err)
		return
	}

	clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// respond sets the refresh cookie and answers with the access token, or writes err.
func (h *AuthHandler) respond(w http.ResponseWriter, status int, issued domain.IssuedSession, err error) {
	if err != nil {
		writeError(w, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    issued.RefreshToken,
		Path:     refreshCookiePath,
		Expires:  issued.RefreshExpiresAt,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, status, authSessionResponse{
		User:        issued.User,
		AccessToken: issued.AccessToken,
		ExpiresIn:   int(domain.AccessTokenTTL.Seconds()),
	})
}

// clearRefreshCookie is Fastify's clearCookie: an empty value that expired in 1970.
func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:    refreshCookieName,
		Value:   "",
		Path:    refreshCookiePath,
		Expires: time.Unix(0, 0),
	})
}

func refreshTokenOf(r *http.Request) string {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// originOf is where the request came from, for the sessions and the auth log.
func originOf(r *http.Request) domain.SessionOrigin {
	return domain.SessionOrigin{UserAgent: r.Header.Get("User-Agent"), IP: middleware.ClientIP(r.Context())}
}
