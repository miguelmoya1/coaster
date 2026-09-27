package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"slices"

	"github.com/invopop/jsonschema"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// aiToolContext is AiToolsContext: who is asking, in which establishment, and what the
// snapshot taken at the start of the turn saw.
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

// aiTools is getAiTools: the tools of the modules the establishment runs, in Nest's order.
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

// aiNoInput is the input of a tool that takes none (z.object({})).
type aiNoInput struct{}

// newAITool builds a tool whose input is the struct T. The schema the model sees comes from
// T's tags (see aiSchemaOf), and run gets the input already read into a T.
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

// aiSchemaOf is the JSON Schema zod gives the AI SDK for a tool's input, written from the
// struct: a field without omitempty is required, jsonschema has the checks (minimum, enum,
// minItems) and jsonschema_description the text the model reads.
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

// aiConfirmation is Confirmation: what a destructive action is about to do, and whether the
// user already said yes.
type aiConfirmation struct {
	summary   string
	confirmed bool
}

// allows reports whether the user may do permission. A platform admin may do everything.
func (tc *aiToolContext) allows(permission domain.EstablishmentPermission) bool {
	return tc.isAdmin || domain.HasPermission(tc.role, permission)
}

// roleName is the role the prompt and the denials name.
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

// execute is runner.execute: it checks the permission, then, for a destructive action, that
// the user confirmed it, and only then runs the command.
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

// aiQuery is runner.query: it checks the permission, runs the query and gives the model only
// what project keeps of the result.
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

// aiToolError is what the model hears when the server refuses the action. A code of
// ErrorCodes also goes as errorKey.
func aiToolError(err error) domain.AIToolResult {
	message := err.Error()
	slog.Error("an assistant tool failed", "error", err)

	result := domain.AIToolResult{Status: domain.AIToolError, Message: "The action failed: " + message}
	if slices.Contains(domain.AllErrorCodes, message) {
		result.ErrorKey = message
	}
	return result
}

// aiFailed is failed(): a problem the tool finds before asking the server.
func aiFailed(message string) domain.AIToolResult {
	return domain.AIToolResult{Status: domain.AIToolError, Message: message}
}

// toEuros is cents in euros, as the model reads money.
func toEuros(cents int) float64 {
	return float64(cents) / 100
}

// toCents is euros in cents, rounded like Math.round. The conversion rounds the product before
// adding the half, as JavaScript does: on some processors Go may otherwise fuse both into one
// instruction and round differently.
func toCents(euros float64) int {
	return mathRound(float64(euros * 100))
}

// mathRound is JavaScript's Math.round: halves go up, also below zero (-2.5 is -2).
func mathRound(x float64) int {
	return int(math.Floor(x + 0.5))
}

// productNameIn and tableNameIn look a name up in the snapshot of the turn, like the tools
// of Nest do.
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

// optionalID is an id the model may leave empty: "" counts as none, as `id ? id : undefined`.
func optionalID(id *string) *string {
	if id == nil || *id == "" {
		return nil
	}
	return id
}
