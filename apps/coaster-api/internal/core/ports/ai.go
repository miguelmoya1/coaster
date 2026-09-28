package ports

import (
	"context"
	"encoding/json"

	"coaster-api/internal/core/domain"
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

type AIService interface {
	Usage(ctx context.Context, establishmentID string) (domain.AIUsage, error)
	Execute(ctx context.Context, establishmentID string, user domain.User, input domain.AIInput) (domain.AIResponse, error)
}
