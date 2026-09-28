package ports

import (
	"context"
	"encoding/json"

	"api-go/internal/core/domain"
)

type AITool struct {
	Name        string
	Description string

	Parameters json.RawMessage

	Run func(ctx context.Context, input json.RawMessage) domain.AIToolResult
}

type AIRequest struct {
	Model string

	FallbackModels []string
	Temperature    float64

	MaxSteps int

	System   string
	Messages []domain.AIMessage
	Tools    []AITool

	OnDelta func(delta string)
}

type AIModel interface {
	Generate(ctx context.Context, request AIRequest) (string, error)
}

type AIUsageRepository interface {
	MessagesThisPeriod(ctx context.Context, establishmentID, period string) (int, error)
	ReserveMessage(ctx context.Context, establishmentID, period string, allowance int) (bool, error)
	ReleaseMessage(ctx context.Context, establishmentID, period string) error
}
