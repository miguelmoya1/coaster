package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type AdminOverviewHandler struct {
	metrics ports.AdminMetricsService
	audit   ports.AdminAuditService
}

func NewAdminOverviewHandler(metrics ports.AdminMetricsService, audit ports.AdminAuditService) *AdminOverviewHandler {
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

	respond.JSON(w, http.StatusOK, metrics)
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

	respond.JSON(w, http.StatusOK, entries)
}
