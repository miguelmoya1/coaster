package domain

import (
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
)

// Monthly allowances of assistant messages when the environment does not set them (quota.ts).
const (
	DefaultMonthlyAIMessages = 500
	DefaultTrialAIMessages   = 100
)

// AIGatewayFailedKey is the translation key apps/web shows when the model could not answer.
const AIGatewayFailedKey = "ai_voice.errors.ai_gateway_failed"

// AIMessage is AiMessage in @coaster/common: one turn of the conversation, "user" or "assistant".
type AIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AIResponse is AiResponse in @coaster/common: the assistant's answer.
type AIResponse struct {
	Text     string `json:"text"`
	IsError  bool   `json:"isError,omitempty"`
	ErrorKey string `json:"errorKey,omitempty"`
}

func AIRefused(code string) AIResponse {
	return AIResponse{Text: code, IsError: true, ErrorKey: code}
}

// AIGatewayFailed is the answer when the model could not answer.
var AIGatewayFailed = AIResponse{Text: AIGatewayFailedKey, IsError: true, ErrorKey: AIGatewayFailedKey}

// AIUsage is AiUsage in @coaster/common: how many messages the establishment has sent this month.
type AIUsage struct {
	Used      int    `json:"used"`
	Allowance int    `json:"allowance"`
	Remaining int    `json:"remaining"`
	Period    string `json:"period"`
}

// AIPeriodOf is periodOf: the month the messages count against, "2026-09", in UTC.
func AIPeriodOf(now time.Time) string {
	return now.UTC().Format("2006-01")
}

// The statuses of AIToolResult.
const (
	AIToolOK                   = "ok"
	AIToolDenied               = "denied"
	AIToolError                = "error"
	AIToolConfirmationRequired = "confirmation_required"
)

// AIToolResult is ToolResult of the AI tools: what a tool tells the model, as JSON.
type AIToolResult struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	Data     any    `json:"data,omitempty"`
	ErrorKey string `json:"errorKey,omitempty"`
}

// AIProductBudgetChars is PRODUCT_BUDGET_CHARS: a catalogue whose list is longer than this is
// left out of the prompt, and the model has to look products up with a tool.
const AIProductBudgetChars = 12_000

// FormatAITables is formatTables: one line per table for the system prompt.
func FormatAITables(tables []Table) string {
	lines := make([]string, 0, len(tables))
	for _, table := range tables {
		lines = append(lines, "- "+table.Name+": ID="+table.ID+", Status="+string(table.Status))
	}
	return strings.Join(lines, "\n")
}

// FormatAICategories is formatCategories: one line per category for the system prompt.
func FormatAICategories(categories []Category) string {
	lines := make([]string, 0, len(categories))
	for _, category := range categories {
		icon := "(None)"
		if category.Icon != nil && *category.Icon != "" {
			icon = *category.Icon
		}
		lines = append(lines, "- "+category.Name+": ID="+category.ID+", Icon="+icon)
	}
	return strings.Join(lines, "\n")
}

// FormatAIOrders is formatOrders: one line per open order, with where it is and how many
// lines it has, but not the lines themselves.
func FormatAIOrders(orders []Order, tables []Table) string {
	lines := make([]string, 0, len(orders))
	for _, order := range orders {
		where := "No table"
		for _, table := range tables {
			if order.TableID != nil && table.ID == *order.TableID {
				where = table.Name
				break
			}
		}

		plural := "s"
		if len(order.Items) == 1 {
			plural = ""
		}

		lines = append(lines, "- Order ID="+order.ID+" at "+where+" ("+strconv.Itoa(len(order.Items))+" item"+plural+")")
	}
	return strings.Join(lines, "\n")
}

// FormatAIProducts is formatProducts: one line per product, or nothing at all (omitted is
// true) when the list would be longer than budget. The length counts UTF-16 units, like
// JavaScript's.
func FormatAIProducts(products []Product, budget int) (list string, omitted bool) {
	lines := make([]string, 0, len(products))
	for _, product := range products {
		lines = append(lines, "- "+product.Name+": ID="+product.ID+
			", Price="+FormatEuros(product.Price)+"€, Stock="+strconv.Itoa(product.CurrentStock))
	}

	list = strings.Join(lines, "\n")
	if utf16Length(list) > budget {
		return "", true
	}
	return list, false
}

// FormatEuros writes cents as euros the way JavaScript writes cents / 100: "2.5", "0.07", "3".
func FormatEuros(cents int) string {
	return strconv.FormatFloat(float64(cents)/100, 'f', -1, 64)
}

// utf16Length is the length JavaScript gives a string.
func utf16Length(s string) int {
	length := 0
	for _, r := range s {
		length += utf16.RuneLen(r)
	}
	return length
}
