package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type AdminMetricsService interface {
	Overview(ctx context.Context) (domain.AdminPlatformMetrics, error)
}

type AdminAuditService interface {
	List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) (domain.Paginated[domain.AdminAuditLogEntry], error)
}

type AdminOverviewHandler struct {
	metrics AdminMetricsService
	audit   AdminAuditService
}

func NewAdminOverviewHandler(metrics AdminMetricsService, audit AdminAuditService) *AdminOverviewHandler {
	return &AdminOverviewHandler{metrics: metrics, audit: audit}
}

func (h *AdminOverviewHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /admin/overview", h.overview, middleware.Admin())
	handle(mux, guard, "GET /admin/audit", h.auditLog, middleware.Admin())
}

func (h *AdminOverviewHandler) overview(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.metrics.Overview(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, metrics)
}

func (h *AdminOverviewHandler) auditLog(w http.ResponseWriter, r *http.Request) {
	query := newAdminListQuery(r.URL.Query(), "targetType", "targetId", "action", "page", "pageSize")
	filter := domain.AdminAuditFilter{
		TargetType: query.oneOf("targetType", domain.AdminAuditTargetTypes, domain.CodeInvalidType),
		TargetID:   query.text("targetId", 64),
		Action:     query.oneOf("action", domain.AdminAuditActions, domain.CodeInvalidType),
	}
	page := query.page()
	if err := query.err(); err != nil {
		writeError(w, err)
		return
	}

	entries, err := h.audit.List(r.Context(), filter, page)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, entries)
}
