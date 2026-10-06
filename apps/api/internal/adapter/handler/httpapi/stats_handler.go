package httpapi

import (
	"net/http"
	"slices"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type StatsHandler struct {
	stats ports.StatsService
}

func NewStatsHandler(stats ports.StatsService) *StatsHandler {
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

	respond.JSON(w, http.StatusOK, stats)
}
