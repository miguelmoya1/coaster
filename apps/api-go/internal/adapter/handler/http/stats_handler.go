package http

import (
	"context"
	"net/http"
	"slices"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type StatsService interface {
	EstablishmentStats(ctx context.Context, establishmentID string, includeHistory bool) (domain.EstablishmentStats, error)
}

type StatsHandler struct {
	stats StatsService
}

func NewStatsHandler(stats StatsService) *StatsHandler {
	return &StatsHandler{stats: stats}
}

func (h *StatsHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/stats", h.get,
		middleware.Permissions(domain.PermissionViewFinancials))
}

func (h *StatsHandler) get(w http.ResponseWriter, r *http.Request) {
	permissions := middleware.EstablishmentPermissionsOf(r.Context())
	includeHistory := slices.Contains(permissions, domain.PermissionViewFinancialsHistory)

	stats, err := h.stats.EstablishmentStats(r.Context(), r.PathValue("establishmentId"), includeHistory)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, stats)
}
