package http

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

type AIService interface {
	Usage(ctx context.Context, establishmentID string) (domain.AIUsage, error)
	Execute(ctx context.Context, establishmentID string, user domain.User, input service.AIInput) (domain.AIResponse, error)
}

// AIHandler is ai.controller.ts: the voice assistant of an establishment.
type AIHandler struct {
	ai AIService
}

func NewAIHandler(ai AIService) *AIHandler {
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

	writeJSON(w, http.StatusOK, usage)
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

	writeJSON(w, http.StatusCreated, response)
}

// aiDelta is the data of a delta event.
type aiDelta struct {
	Delta string `json:"delta"`
}

// stream answers with server-sent events: a delta event for each piece of the answer and a
// done event with the whole answer. Like Nest, it answers 200 before running the command,
// so a refusal (not being a member, the quota) arrives as a done event with its code as
// errorKey, and any other error as the done event of a gateway error.
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

// aiRequest is the body of POST ai and ai/stream. Nest reads prompt and messages with
// @Body and no DTO: nothing is validated and any other property is ignored.
type aiRequest struct {
	Prompt   json.RawMessage    `json:"prompt"`
	Messages []domain.AIMessage `json:"messages"`
}

// readAIInput reads the body. A prompt that is not text, or messages that are not a list,
// are left out as if they did not come.
func readAIInput(r *http.Request) (service.AIInput, error) {
	body, _, err := readJSON(r)
	if err != nil {
		return service.AIInput{}, err
	}

	var request aiRequest
	_ = json.Unmarshal(body, &request)

	input := service.AIInput{Messages: request.Messages}
	var prompt string
	if strings.HasPrefix(string(request.Prompt), `"`) && json.Unmarshal(request.Prompt, &prompt) == nil {
		input.Prompt = &prompt
	}
	return input, nil
}

// sseData writes the data of an event as JSON.stringify does.
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
