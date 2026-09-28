package domain

import (
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
)

const (
	DefaultMonthlyAIMessages = 500
	DefaultTrialAIMessages   = 100
)

const AIGatewayFailedKey = "ai_voice.errors.ai_gateway_failed"

type AIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIResponse struct {
	Text     string `json:"text"`
	IsError  bool   `json:"isError,omitempty"`
	ErrorKey string `json:"errorKey,omitempty"`
}

func AIRefused(code string) AIResponse {
	return AIResponse{Text: code, IsError: true, ErrorKey: code}
}

var AIGatewayFailed = AIResponse{Text: AIGatewayFailedKey, IsError: true, ErrorKey: AIGatewayFailedKey}

type AIUsage struct {
	Used      int    `json:"used"`
	Allowance int    `json:"allowance"`
	Remaining int    `json:"remaining"`
	Period    string `json:"period"`
}

func AIPeriodOf(now time.Time) string {
	return now.UTC().Format("2006-01")
}

const (
	AIToolOK                   = "ok"
	AIToolDenied               = "denied"
	AIToolError                = "error"
	AIToolConfirmationRequired = "confirmation_required"
)

type AIToolResult struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	Data     any    `json:"data,omitempty"`
	ErrorKey string `json:"errorKey,omitempty"`
}

const AIProductBudgetChars = 12_000

func FormatAITables(tables []Table) string {
	lines := make([]string, 0, len(tables))
	for _, table := range tables {
		lines = append(lines, "- "+table.Name+": ID="+table.ID+", Status="+string(table.Status))
	}
	return strings.Join(lines, "\n")
}

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

func FormatEuros(cents int) string {
	return strconv.FormatFloat(float64(cents)/100, 'f', -1, 64)
}

func utf16Length(s string) int {
	length := 0
	for _, r := range s {
		length += utf16.RuneLen(r)
	}
	return length
}
