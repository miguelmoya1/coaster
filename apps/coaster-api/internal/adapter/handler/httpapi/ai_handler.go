package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type AIHandler struct {
	ai ports.AIService
}

func NewAIHandler(ai ports.AIService) *AIHandler {
	return &AIHandler{ai: ai}
}

func (h *AIHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	rules := []middleware.Rule{middleware.Permissions(), middleware.Throttle(20, time.Minute)}

	handle(mux, guard, "GET /establishments/{establishmentId}/ai/usage", h.usage, rules...)
	handle(mux, guard, "POST /establishments/{establishmentId}/ai", h.execute, rules...)
	handle(mux, guard, "POST /establishments/{establishmentId}/ai/stream", h.stream, rules...)
}

func (h *AIHandler) usage(w http.ResponseWriter, r *http.Request) {
	usage, err := h.ai.Usage(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, usage)
}

func (h *AIHandler) execute(w http.ResponseWriter, r *http.Request) {
	input, err := readAIInput(r)
	if err != nil {
		writeError(w, err)
		return
	}

	user := middleware.CurrentUser(r.Context())
	response, err := h.ai.Execute(context.WithoutCancel(r.Context()), r.PathValue("establishmentId"), *user, input)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, response)
}

type aiDelta struct {
	Delta string `json:"delta"`
}

func (h *AIHandler) stream(w http.ResponseWriter, r *http.Request) {
	input, err := readAIInput(r)
	if err != nil {
		writeError(w, err)
		return
	}

	header := w.Header()
	header.Set("Content-Type", "text/event-stream")
	header.Set("Cache-Control", "no-cache, no-transform")
	header.Set("Connection", "keep-alive")
	header.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	flush := http.NewResponseController(w).Flush
	flush()

	send := func(event string, data any) {
		io.WriteString(w, "event: "+event+"\ndata: "+sseData(data)+"\n\n")
		flush()
	}

	input.OnDelta = func(delta string) { send("delta", aiDelta{Delta: delta}) }

	user := middleware.CurrentUser(r.Context())
	response, err := h.ai.Execute(context.WithoutCancel(r.Context()), r.PathValue("establishmentId"), *user, input)
	if err != nil {
		var domainErr *domain.Error
		if errors.As(err, &domainErr) {
			response = domain.AIRefused(domainErr.Code)
		} else {
			slog.Error("the assistant failed", "error", err)
			response = domain.AIGatewayFailed
		}
	}

	send("done", response)
}

type aiRequest struct {
	Prompt   json.RawMessage    `json:"prompt"`
	Messages []domain.AIMessage `json:"messages"`
}

func readAIInput(r *http.Request) (domain.AIInput, error) {
	body, _, err := readJSON(r)
	if err != nil {
		return domain.AIInput{}, err
	}

	var request aiRequest
	_ = json.Unmarshal(body, &request)

	input := domain.AIInput{Messages: request.Messages}
	var prompt string
	if strings.HasPrefix(string(request.Prompt), `"`) && json.Unmarshal(request.Prompt, &prompt) == nil {
		input.Prompt = &prompt
	}
	return input, nil
}

func sseData(data any) string {
	var text strings.Builder
	encoder := json.NewEncoder(&text)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(data); err != nil {
		slog.Error("encoding an event of the assistant", "error", err)
		return "{}"
	}
	return strings.TrimSuffix(text.String(), "\n")
}
