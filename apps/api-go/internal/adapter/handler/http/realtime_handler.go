package http

import (
	"log/slog"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// RealtimeHandler serves an establishment's event stream (RealtimeController in Nest).
type RealtimeHandler struct {
	realtime *service.RealtimeService
}

func NewRealtimeHandler(realtime *service.RealtimeService) *RealtimeHandler {
	return &RealtimeHandler{realtime: realtime}
}

func (h *RealtimeHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/events", h.watch, middleware.Permissions())
}

// watch keeps the stream open until the client hangs up or the stream closes.
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
