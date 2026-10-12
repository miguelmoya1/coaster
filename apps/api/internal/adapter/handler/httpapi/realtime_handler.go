package httpapi

import (
	"log/slog"
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type RealtimeHandler struct {
	realtime ports.RealtimeService
}

func NewRealtimeHandler(realtime ports.RealtimeService) *RealtimeHandler {
	return &RealtimeHandler{realtime: realtime}
}

func (h *RealtimeHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/events", h.watch, middleware.Permissions())
}

func (h *RealtimeHandler) watch(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.PathValue("establishmentId")
	user := middleware.CurrentUser(r.Context())

	stream := newRealtimeStream(user.ID)
	remove := h.realtime.Watch(establishmentID, stream)
	defer remove()

	header := w.Header()
	header.Set("Content-Type", "text/event-stream")
	header.Set("Cache-Control", "no-cache, no-transform")
	header.Set("Connection", "keep-alive")
	header.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	var missed func() []domain.RealtimeFrame
	if lastEventID := r.Header.Get("Last-Event-ID"); lastEventID != "" {
		missed = func() []domain.RealtimeFrame {
			return h.realtime.Replay(r.Context(), establishmentID, lastEventID)
		}
	}

	slog.Debug("a user is watching an establishment", "user", user.ID, "establishment", establishmentID)
	stream.run(r.Context(), w, http.NewResponseController(w).Flush, missed)
	slog.Debug("a user stopped watching an establishment", "user", user.ID, "establishment", establishmentID)
}
