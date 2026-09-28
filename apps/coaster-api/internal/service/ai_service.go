package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

const (
	aiModel           = "zai/glm-4.7"
	aiTemperature     = 0.1
	aiMaxToolSteps    = 8
	aiMaxHistory      = 10
	aiDefaultLanguage = "es"
)

var aiFallbackModels = []string{
	"openai/gpt-oss-120b",
	"openai/gpt-oss-20b",
	"nvidia/nemotron-nano-9b-v2",
	"google/gemini-3.6-flash",
}

type AIConfig struct {
	MonthlyMessages      string
	TrialMonthlyMessages string
}

type AIDependencies struct {
	Model    ports.AIModel
	Usage    ports.AIUsageRepository
	Security *SecurityService
	Config   AIConfig

	Categories *CategoryService
	Products   *ProductService
	Orders     *OrderService
	Tables     *TableService
	Stats      *StatsService
	Shifts     *ShiftService
	Exchanges  *ShiftExchangeService
	Members    *EstablishmentMemberService
}

type AIService struct {
	model    ports.AIModel
	usage    ports.AIUsageRepository
	security *SecurityService
	config   AIConfig

	categories *CategoryService
	products   *ProductService
	orders     *OrderService
	tables     *TableService
	stats      *StatsService
	shifts     *ShiftService
	exchanges  *ShiftExchangeService
	members    *EstablishmentMemberService

	now func() time.Time
}

func NewAIService(deps AIDependencies) *AIService {
	return &AIService{
		model:      deps.Model,
		usage:      deps.Usage,
		security:   deps.Security,
		config:     deps.Config,
		categories: deps.Categories,
		products:   deps.Products,
		orders:     deps.Orders,
		tables:     deps.Tables,
		stats:      deps.Stats,
		shifts:     deps.Shifts,
		exchanges:  deps.Exchanges,
		members:    deps.Members,
		now:        time.Now,
	}
}

func (s *AIService) Usage(ctx context.Context, establishmentID string) (domain.AIUsage, error) {
	now := s.now()

	used, err := s.usage.MessagesThisPeriod(ctx, establishmentID, domain.AIPeriodOf(now))
	if err != nil {
		return domain.AIUsage{}, err
	}

	allowance, err := s.allowanceFor(ctx, establishmentID)
	if err != nil {
		return domain.AIUsage{}, err
	}

	return domain.AIUsage{
		Used:      used,
		Allowance: allowance,
		Remaining: max(0, allowance-used),
		Period:    domain.AIPeriodOf(now),
	}, nil
}

func (s *AIService) Execute(ctx context.Context, establishmentID string, user domain.User, input domain.AIInput) (domain.AIResponse, error) {
	slog.Debug("the assistant got a message", "userId", user.ID, "establishmentId", establishmentID)

	platformRole, err := s.security.UserRole(ctx, user.ID)
	if err != nil {
		return domain.AIResponse{}, err
	}
	isAdmin := platformRole == domain.RoleAdmin

	role := domain.EstablishmentRoleOwner
	if !isAdmin {
		membership, err := s.security.Membership(ctx, user.ID, establishmentID)
		if err != nil {
			return domain.AIResponse{}, err
		}
		if membership == nil || !membership.Active {
			return domain.AIResponse{}, domain.Forbidden(domain.CodeMemberNotFound)
		}
		role = domain.AsEstablishmentRole(membership.Role)
	}

	allowance, err := s.allowanceFor(ctx, establishmentID)
	if err != nil {
		return domain.AIResponse{}, err
	}

	period := domain.AIPeriodOf(s.now())
	reserved, err := s.usage.ReserveMessage(ctx, establishmentID, period, allowance)
	if err != nil {
		return domain.AIResponse{}, err
	}
	if !reserved {
		slog.Warn("an establishment has used its assistant messages this month",
			"establishmentId", establishmentID, "allowance", allowance)
		return domain.AIResponse{}, domain.Forbidden(domain.CodeAiQuotaExceeded)
	}

	response, err := s.answer(ctx, establishmentID, user, isAdmin, role, input)
	if err != nil || response.IsError {
		if releaseErr := s.usage.ReleaseMessage(ctx, establishmentID, period); releaseErr != nil {
			slog.Error("could not give back an assistant message that got no answer",
				"establishmentId", establishmentID, "error", releaseErr)
		}
	}
	return response, err
}

func (s *AIService) answer(ctx context.Context, establishmentID string, user domain.User, isAdmin bool, role domain.EstablishmentRole, input domain.AIInput) (domain.AIResponse, error) {

	modules, err := s.security.EnabledModules(ctx, establishmentID)
	if err != nil {
		return domain.AIResponse{}, err
	}

	tc, err := s.snapshot(ctx, establishmentID, modules)
	if err != nil {
		return domain.AIResponse{}, err
	}
	tc.user = user
	tc.isAdmin = isAdmin
	tc.role = role

	language := user.Language
	if language == "" {
		language = aiDefaultLanguage
	}

	messages, err := conversation(input)
	if err != nil {
		slog.Error("the AI Gateway failed", "error", err)
		return domain.AIGatewayFailed, nil
	}

	request := ports.AIRequest{
		Model:          aiModel,
		FallbackModels: aiFallbackModels,
		Temperature:    aiTemperature,
		MaxSteps:       aiMaxToolSteps,
		System:         aiSystemPrompt(tc, language, s.now()),
		Messages:       messages,
		Tools:          s.aiTools(tc),
	}

	var streamed strings.Builder
	if input.OnDelta != nil {
		request.OnDelta = func(delta string) {
			streamed.WriteString(delta)
			input.OnDelta(delta)
		}
	}

	text, err := s.model.Generate(ctx, request)

	if streamedText := strings.TrimSpace(streamed.String()); streamedText != "" {
		text, err = streamedText, nil
	}
	if err != nil {
		slog.Error("the AI Gateway failed", "error", err)
		return domain.AIGatewayFailed, nil
	}

	if text == "" {
		text = aiFallbackText(language)
	}
	return domain.AIResponse{Text: text}, nil
}

func (s *AIService) allowanceFor(ctx context.Context, establishmentID string) (int, error) {
	subscription, err := s.security.SubscriptionState(ctx, establishmentID)
	if err != nil {
		return 0, err
	}

	if subscription != nil && subscription.Status == domain.SubscriptionTrialing {
		return readAllowance(s.config.TrialMonthlyMessages, domain.DefaultTrialAIMessages), nil
	}
	return readAllowance(s.config.MonthlyMessages, domain.DefaultMonthlyAIMessages), nil
}

func readAllowance(value string, fallback int) int {
	allowance, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return allowance
}

func (s *AIService) snapshot(ctx context.Context, establishmentID string, modules []domain.EstablishmentModule) (*aiToolContext, error) {
	tc := &aiToolContext{establishmentID: establishmentID, modules: modules}
	hasOrders := slices.Contains(modules, domain.ModuleOrders)
	hasInventory := slices.Contains(modules, domain.ModuleInventory)

	var err error
	if hasOrders {
		if tc.tables, err = s.tables.List(ctx, establishmentID); err != nil {
			return nil, err
		}
	}
	if hasInventory {
		if tc.products, err = s.products.List(ctx, establishmentID); err != nil {
			return nil, err
		}
	}
	if hasOrders {
		if tc.openOrders, err = s.orders.List(ctx, establishmentID, domain.OrderOpen); err != nil {
			return nil, err
		}
	}
	if hasInventory {
		if tc.categories, err = s.categories.List(ctx, establishmentID); err != nil {
			return nil, err
		}
	}
	return tc, nil
}

func conversation(input domain.AIInput) ([]domain.AIMessage, error) {
	if len(input.Messages) == 0 {
		if input.Prompt == nil {
			return nil, errors.New("invalid prompt: the message has no content")
		}
		return []domain.AIMessage{{Role: "user", Content: *input.Prompt}}, nil
	}

	recent := input.Messages[max(0, len(input.Messages)-aiMaxHistory):]
	for _, message := range recent {
		switch message.Role {
		case "user", "assistant", "system":
		default:
			return nil, fmt.Errorf("invalid prompt: the role %q is not one the model knows", message.Role)
		}
	}
	return recent, nil
}

func aiFallbackText(language string) string {
	if language == "es" {
		return "Acción completada con éxito."
	}
	return "Action completed successfully."
}

func aiSystemPrompt(tc *aiToolContext, language string, now time.Time) string {
	catalogue := "This establishment has too large a catalogue to list here. Call listProducts with a search term to find the ones you need, and never invent a product UUID."
	if list, omitted := domain.FormatAIProducts(tc.products, domain.AIProductBudgetChars); !omitted {
		catalogue = "Below is the list of products available in this establishment (with their UUIDs, prices, and current stock):\n" + orNone(list)
	}

	permissions := "(ADMIN: every permission)"
	if !tc.isAdmin {
		lines := []string{}
		for _, permission := range domain.RolePermissions(tc.role) {
			lines = append(lines, "- "+string(permission))
		}
		permissions = strings.Join(lines, "\n")
	}

	modules := make([]string, 0, len(tc.modules))
	for _, module := range tc.modules {
		modules = append(modules, string(module))
	}

	prompt := fmt.Sprintf(aiSystemPromptTemplate,
		tc.establishmentID,
		tc.user.Name, tc.user.ID, tc.roleName(),
		domain.FormatISO(now),
		catalogue,
		orNone(domain.FormatAITables(tc.tables)),
		orNone(domain.FormatAICategories(tc.categories)),
		orNone(domain.FormatAIOrders(tc.openOrders, tc.tables)),
		strings.Join(modules, ", "),
		permissions,
		language,
	)
	return strings.TrimSpace(prompt)
}

func orNone(list string) string {
	if list == "" {
		return "(None)"
	}
	return list
}

const aiSystemPromptTemplate = `You are the Coaster Voice Assistant, a professional real-time management system for establishments and restaurants.
Current Establishment ID: "%s".
Current User: "%s" (ID: "%s"), Role: "%s".
Current date and time (UTC): %s.

=== AVAILABLE DATA ===
%s

Below is the list of tables available (with their UUIDs and statuses):
%s

Below is the list of categories available (with their UUIDs and icons):
%s

Below are the open orders. Call getOrderDetails for the lines of one, which is where item IDs,
served and paid quantities live:
%s

This snapshot was taken when the conversation turn started. Anything beyond it (revenue, past days,
shifts, staff, stock alerts) must be fetched with a read tool instead of guessed.

=== MODULES THIS ESTABLISHMENT RUNS ===
%s
Only tools belonging to these modules exist in this conversation. If the user asks for something
from a module that is off, say it is not enabled here rather than reaching for a tool.

=== THIS USER'S PERMISSIONS ===
%s
Tools outside this list will be rejected by the server. If the user asks for one of them, say plainly
that their role does not allow it instead of calling the tool.

=== BEHAVIOR RULES ===
1. [CRITICAL] It is strictly forbidden to respond with plain text if the user requests any action or command and you have all necessary information. You must invoke one of the available tools instead of replying with conversational text.
2. Carefully match the products, tables, or orders mentioned in the user's request with the UUIDs listed in the lists above:
   - For products: Match names like "cerveza", "café", "bocadillo" to their corresponding Product UUID in the available products list.
   - For tables: Match names like "Mesa 1", "Mesa 5", "Terraza" to their corresponding Table UUID in the available tables list.
   - For categories: Match names like "bebidas", "comidas", "postres" to their corresponding Category UUID in the available categories list.
   - For orders: Match the requested table name or table/order ID to find the correct active order UUID.
3. [READ BEFORE YOU ACT] When a question is about data not in the snapshot above, call the matching read tool first (getEstablishmentStats for takings, getOrdersByDate for past days, listShifts for the rota, listMembers for staff, listProducts with lowStockOnly for stock alerts) and answer from its result. Never invent figures.
4. [CHAINING] You may call several tools in a row within the same turn, for example listMembers to resolve a worker name into a UUID and then createShift. Do it silently and only report the final outcome.
5. [DESTRUCTIVE ACTIONS] Deleting, cancelling, removing staff and sending invitations are irreversible. Their tools take a "confirmed" flag: call them with confirmed=false first, read the confirmation request back to the user in their language, and only call again with confirmed=true after the user clearly agrees in a later message. Never set confirmed=true on the first attempt, and never assume consent from an ambiguous answer.
6. Money is always spoken and written in euros (e.g. 2,50 €), never in cents.
7. Tool results come back as JSON with a "status" field. On "denied" tell the user they lack permission. On "error" explain what failed in plain words. On "confirmation_required" ask the confirmation question. Never show raw JSON or UUIDs to the user; refer to things by their names.
7b. [FORMATTING] Your answer is rendered as markdown inside a narrow panel (about 26rem wide) and is also read out loud, so keep it short and scannable:
   - Default to one or two plain sentences. Only reach for structure when you are actually listing things.
   - Use "-" bullet lists for several items, one short line each. Put the name first, then the figure.
   - Use **bold** for the numbers that matter (amounts, quantities, product names being changed). Do not bold whole sentences.
   - Never use headings, tables, horizontal rules, code blocks or images: they look broken at this width.
   - No emoji unless the user uses them first.
8. Once the action is successfully executed, confirm what you have done in detail.
9. Important: Always respond to the user in their preferred language. Currently, the user's language is: "%s" (e.g. "es" for Spanish, "en" for English). Return your final response in this language.
10. [CONTEXT & MULTI-TURN CHAT] Use the conversation history (previous messages) to resolve context, pronouns, and parameters (like product type, quantity, table, or order). Even if the user's latest message is just a simple response to your clarifying question (e.g., "una Heineken", "a la mesa tres", "dos", "sí"), you must combine it with the previous messages. If the combined intent describes a complete action/command, you must execute the corresponding tool immediately instead of asking more questions or responding with conversational text. Do not ask for information that the user has already provided in previous turns.
    If all required information to call a tool is present, DO NOT RESPOND WITH CONVERSATIONAL TEXT, JUST CALL THE TOOL. If information is missing, ask a brief clarifying question in the user's language.
`
