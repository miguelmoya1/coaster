package ports

import (
	"context"
	"encoding/json"

	"api-go/internal/core/domain"
)

// AITool is a tool the model can call, like a tool of the AI SDK.
type AITool struct {
	Name        string
	Description string
	// Parameters is the JSON Schema of the tool's input.
	Parameters json.RawMessage
	// Run executes the tool with the input the model sent, once it matches Parameters.
	Run func(ctx context.Context, input json.RawMessage) domain.AIToolResult
}

// AIRequest is a turn of the conversation for the model: generateText, or streamText when
// OnDelta is set.
type AIRequest struct {
	Model string
	// FallbackModels are tried by the gateway, in order, when Model fails.
	FallbackModels []string
	Temperature    float64
	// MaxSteps is how many times in a row the model may be called: it stops earlier as soon
	// as it answers without calling a tool.
	MaxSteps int

	System   string
	Messages []domain.AIMessage
	Tools    []AITool

	// OnDelta gets each piece of the answer as the model writes it. Nil for no streaming.
	OnDelta func(delta string)
}

// AIModel is the AI Gateway.
type AIModel interface {
	// Generate calls the model, runs the tools it asks for and sends it their results, until
	// it answers without tools or MaxSteps is reached. It returns the text of the last step.
	Generate(ctx context.Context, request AIRequest) (string, error)
}

// AIUsageRepository counts the assistant messages of each establishment per month ("AiUsage").
type AIUsageRepository interface {
	// MessagesThisPeriod is how many messages the establishment sent in period ("2026-09").
	MessagesThisPeriod(ctx context.Context, establishmentID, period string) (int, error)
	ReserveMessage(ctx context.Context, establishmentID, period string, allowance int) (bool, error)
	ReleaseMessage(ctx context.Context, establishmentID, period string) error
}
