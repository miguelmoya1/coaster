package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"slices"

	"github.com/invopop/jsonschema"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type aiToolContext struct {
	establishmentID string
	modules         []domain.EstablishmentModule
	user            domain.User
	isAdmin         bool
	role            domain.EstablishmentRole
	products        []domain.Product
	categories      []domain.Category
	tables          []domain.Table
	openOrders      []domain.Order
}

func (s *AIService) aiTools(tc *aiToolContext) []ports.AITool {
	var tools []ports.AITool

	if slices.Contains(tc.modules, domain.ModuleOrders) {
		tools = append(tools, s.tableTools(tc)...)
		tools = append(tools, s.orderTools(tc)...)
	}
	if slices.Contains(tc.modules, domain.ModuleInventory) {
		tools = append(tools, s.productTools(tc)...)
		tools = append(tools, s.categoryTools(tc)...)
	}
	if slices.Contains(tc.modules, domain.ModuleOrders) {
		tools = append(tools, s.statsTools(tc)...)
	}
	tools = append(tools, s.shiftTools(tc)...)
	tools = append(tools, s.memberTools(tc)...)

	return tools
}

type aiNoInput struct{}

func newAITool[T any](name, description string, run func(ctx context.Context, input T) domain.AIToolResult) ports.AITool {
	return ports.AITool{
		Name:        name,
		Description: description,
		Parameters:  aiSchemaOf[T](),
		Run: func(ctx context.Context, raw json.RawMessage) domain.AIToolResult {
			var input T
			if err := json.Unmarshal(raw, &input); err != nil {
				return aiToolError(err)
			}
			return run(ctx, input)
		},
	}
}

func aiSchemaOf[T any]() json.RawMessage {
	reflector := jsonschema.Reflector{Anonymous: true, DoNotReference: true, ExpandedStruct: true}
	schema := reflector.Reflect(new(T))
	schema.Version = "http://json-schema.org/draft-07/schema#"

	data, err := json.Marshal(schema)
	if err != nil {
		panic(fmt.Sprintf("the input of an AI tool cannot be written as a JSON Schema: %v", err))
	}
	return data
}

type aiConfirmation struct {
	summary   string
	confirmed bool
}

func (tc *aiToolContext) allows(permission domain.EstablishmentPermission) bool {
	return tc.isAdmin || domain.HasPermission(tc.role, permission)
}

func (tc *aiToolContext) roleName() string {
	if tc.isAdmin {
		return string(domain.RoleAdmin)
	}
	return string(tc.role)
}

func (tc *aiToolContext) denied(permission domain.EstablishmentPermission) domain.AIToolResult {
	slog.Warn("the assistant was denied a permission", "userId", tc.user.ID, "permission", permission, "establishmentId", tc.establishmentID)
	return domain.AIToolResult{
		Status: domain.AIToolDenied,
		Message: fmt.Sprintf("The user's role (%s) does not allow this action. It requires the '%s' permission. "+
			"Tell the user they lack permission and do not retry.", tc.roleName(), permission),
	}
}

func (tc *aiToolContext) execute(permission domain.EstablishmentPermission, confirmation *aiConfirmation, command func() error) domain.AIToolResult {
	if !tc.allows(permission) {
		return tc.denied(permission)
	}

	if confirmation != nil && !confirmation.confirmed {
		slog.Debug("the assistant awaits a confirmation", "permission", permission, "summary", confirmation.summary)
		return domain.AIToolResult{
			Status: domain.AIToolConfirmationRequired,
			Message: "This action is destructive and has NOT been executed. Ask the user to confirm out loud that you should " +
				confirmation.summary + ", and only call this tool again with confirmed=true after they say yes.",
		}
	}

	if err := command(); err != nil {
		return aiToolError(err)
	}
	return domain.AIToolResult{Status: domain.AIToolOK, Message: "Action completed successfully."}
}

func aiQuery[T any](tc *aiToolContext, permission domain.EstablishmentPermission, query func() (T, error), project func(T) any) domain.AIToolResult {
	if !tc.allows(permission) {
		return tc.denied(permission)
	}

	result, err := query()
	if err != nil {
		return aiToolError(err)
	}
	return domain.AIToolResult{Status: domain.AIToolOK, Message: "Query completed.", Data: project(result)}
}

func aiToolError(err error) domain.AIToolResult {
	message := err.Error()
	slog.Error("an assistant tool failed", "error", err)

	result := domain.AIToolResult{Status: domain.AIToolError, Message: "The action failed: " + message}
	if slices.Contains(domain.AllErrorCodes, message) {
		result.ErrorKey = message
	}
	return result
}

func aiFailed(message string) domain.AIToolResult {
	return domain.AIToolResult{Status: domain.AIToolError, Message: message}
}

func toEuros(cents int) float64 {
	return float64(cents) / 100
}

func toCents(euros float64) int {
	return mathRound(float64(euros * 100))
}

func mathRound(x float64) int {
	return int(math.Floor(x + 0.5))
}

func productNameIn(products []domain.Product, productID string) string {
	for _, product := range products {
		if product.ID == productID {
			return product.Name
		}
	}
	return "Unknown product"
}

func tableNameIn(tables []domain.Table, tableID *string) string {
	if tableID == nil {
		return "No table"
	}
	for _, table := range tables {
		if table.ID == *tableID {
			return table.Name
		}
	}
	return "No table"
}
