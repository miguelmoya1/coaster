package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

type AdminEstablishmentService interface {
	List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest) (domain.Paginated[domain.AdminEstablishmentSummary], error)
	Detail(ctx context.Context, establishmentID string) (domain.AdminEstablishmentDetail, error)
	Rename(ctx context.Context, actorID, establishmentID, name string) error
	UpdateModules(ctx context.Context, actorID, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error)
	GrantPlan(ctx context.Context, actorID, establishmentID string, input service.GrantPlanInput) error
	RevokePlan(ctx context.Context, actorID, establishmentID string, reason *string) error
}

// AdminEstablishmentHandler is admin-establishments.controller.ts. Its writes go through even
// when the establishment's subscription has lapsed.
type AdminEstablishmentHandler struct {
	establishments AdminEstablishmentService
}

func NewAdminEstablishmentHandler(establishments AdminEstablishmentService) *AdminEstablishmentHandler {
	return &AdminEstablishmentHandler{establishments: establishments}
}

func (h *AdminEstablishmentHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	admin, skip := middleware.Admin(), middleware.SkipSubscriptionCheck()

	handle(mux, guard, "GET /admin/establishments", h.list, admin, skip)
	handle(mux, guard, "GET /admin/establishments/{establishmentId}", h.detail, admin, skip)
	handle(mux, guard, "PATCH /admin/establishments/{establishmentId}", h.rename, admin, skip)
	handle(mux, guard, "PATCH /admin/establishments/{establishmentId}/modules", h.updateModules, admin, skip)
	handle(mux, guard, "POST /admin/establishments/{establishmentId}/plan", h.grantPlan, admin, skip)
	handle(mux, guard, "POST /admin/establishments/{establishmentId}/plan/revoke", h.revokePlan, admin, skip)
}

// adminBillingSources are the billingSource values a list can be filtered by.
var adminBillingSources = []string{
	string(domain.BillingSourceNone),
	string(domain.BillingSourceStripe),
	string(domain.BillingSourceManual),
}

// adminSubscriptionStatuses are every SubscriptionStatus, for the status filter.
var adminSubscriptionStatuses = []string{
	string(domain.SubscriptionInactive),
	string(domain.SubscriptionTrialing),
	string(domain.SubscriptionActive),
	string(domain.SubscriptionPastDue),
	string(domain.SubscriptionCanceled),
	string(domain.SubscriptionUnpaid),
	string(domain.SubscriptionExpired),
}

// adminRenameRequest is RenameEstablishmentDto.
type adminRenameRequest struct {
	Name string `json:"name" validate:"required,min=3,max=50" msg:"required=REQUIRED,min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
}

// adminModulesRequest is UpdateEstablishmentModulesDto.
type adminModulesRequest struct {
	Modules []string `json:"modules" validate:"unique,dive,oneof=TIME_TRACKING ORDERS INVENTORY" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
}

// adminGrantPlanRequest is GrantEstablishmentPlanDto: only PRO can be granted.
type adminGrantPlanRequest struct {
	Plan         string  `json:"plan" validate:"oneof=PRO" msg:"oneof=INVALID_SUBSCRIPTION_PLAN,type=INVALID_SUBSCRIPTION_PLAN"`
	DurationDays *int    `json:"durationDays" validate:"omitnil,min=1,max=3650" msg:"min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
	Reason       *string `json:"reason" validate:"omitnil,max=280" msg:"max=MAX_LENGTH,type=INVALID_TYPE"`
}

// adminRevokePlanRequest is RevokeEstablishmentPlanDto.
type adminRevokePlanRequest struct {
	Reason *string `json:"reason" validate:"omitnil,max=280" msg:"max=MAX_LENGTH,type=INVALID_TYPE"`
}

// list reads AdminEstablishmentsQueryDto.
func (h *AdminEstablishmentHandler) list(w http.ResponseWriter, r *http.Request) {
	query := newAdminListQuery(r.URL.Query(), "q", "billingSource", "status", "page", "pageSize")
	filter := domain.AdminEstablishmentFilter{
		Search:        query.text("q", 120),
		BillingSource: domain.EstablishmentBillingSource(query.oneOf("billingSource", adminBillingSources, domain.CodeInvalidType)),
		Status:        domain.SubscriptionStatus(query.oneOf("status", adminSubscriptionStatuses, domain.CodeInvalidType)),
	}
	page := query.page()
	if err := query.err(); err != nil {
		writeError(w, err)
		return
	}

	establishments, err := h.establishments.List(r.Context(), filter, page)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, establishments)
}

func (h *AdminEstablishmentHandler) detail(w http.ResponseWriter, r *http.Request) {
	detail, err := h.establishments.Detail(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, detail)
}

func (h *AdminEstablishmentHandler) rename(w http.ResponseWriter, r *http.Request) {
	var input adminRenameRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	actor := middleware.CurrentUser(r.Context())
	if err := h.establishments.Rename(r.Context(), actor.ID, r.PathValue("establishmentId"), input.Name); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AdminEstablishmentHandler) updateModules(w http.ResponseWriter, r *http.Request) {
	var input adminModulesRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	modules := make([]domain.EstablishmentModule, len(input.Modules))
	for i, module := range input.Modules {
		modules[i] = domain.EstablishmentModule(module)
	}

	actor := middleware.CurrentUser(r.Context())
	settings, err := h.establishments.UpdateModules(r.Context(), actor.ID, r.PathValue("establishmentId"), modules)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, settings)
}

func (h *AdminEstablishmentHandler) grantPlan(w http.ResponseWriter, r *http.Request) {
	var input adminGrantPlanRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	actor := middleware.CurrentUser(r.Context())
	err := h.establishments.GrantPlan(r.Context(), actor.ID, r.PathValue("establishmentId"), service.GrantPlanInput{
		Plan:         domain.SubscriptionPlan(input.Plan),
		DurationDays: input.DurationDays,
		Reason:       input.Reason,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *AdminEstablishmentHandler) revokePlan(w http.ResponseWriter, r *http.Request) {
	var input adminRevokePlanRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	actor := middleware.CurrentUser(r.Context())
	if err := h.establishments.RevokePlan(r.Context(), actor.ID, r.PathValue("establishmentId"), input.Reason); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
