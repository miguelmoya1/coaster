package escpos

import (
	"encoding/json"
	"fmt"
	"strings"
)

const printWidth = 32

type TicketPayload struct {
	Type     string       `json:"type"`    
	BarName  string       `json:"barName"`
	Table    string       `json:"table"`
	Date     string       `json:"date"`
	Items    []TicketItem `json:"items"`
	Total    string       `json:"total"`
	Currency string       `json:"currency"`
	Notes    string       `json:"notes"`
	RawText  string       `json:"rawText"`
}

type TicketItem struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Price    string `json:"price"`
	Total    string `json:"total"`
}

func TryParsePayload(data []byte) (TicketPayload, bool) {
	var payload TicketPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return payload, false
	}
	if payload.Type == "" {
		return payload, false
	}
	return payload, true
}

func RenderTicket(payload TicketPayload) []byte {

	if payload.Type == "raw" {
		var buf []byte
		buf = append(buf, Init...)
		buf = append(buf, []byte(payload.RawText)...)
		buf = append(buf, FeedAndCut...)
		return buf
	}

	var buf []byte


	buf = append(buf, Init...)


	buf = append(buf, AlignCenter...)
	buf = append(buf, BoldOn...)
	buf = append(buf, DoubleHeight...)
	buf = append(buf, []byte(payload.BarName)...)
	buf = append(buf, LineFeed...)
	buf = append(buf, NormalSize...)
	buf = append(buf, BoldOff...)


	buf = append(buf, []byte(separator())...)
	buf = append(buf, LineFeed...)


	buf = append(buf, AlignLeft...)
	if payload.Table != "" {
		buf = append(buf, []byte(fmt.Sprintf("Mesa: %s", payload.Table))...)
		buf = append(buf, LineFeed...)
	}
	if payload.Date != "" {
		buf = append(buf, []byte(fmt.Sprintf("Fecha: %s", payload.Date))...)
		buf = append(buf, LineFeed...)
	}


	buf = append(buf, []byte(separator())...)
	buf = append(buf, LineFeed...)


	for _, item := range payload.Items {
		line := formatItemLine(item)
		buf = append(buf, []byte(line)...)
		buf = append(buf, LineFeed...)
	}


	buf = append(buf, []byte(separator())...)
	buf = append(buf, LineFeed...)


	currency := payload.Currency
	if currency == "" {
		currency = "EUR"
	}
	totalStr := fmt.Sprintf("TOTAL: %s %s", payload.Total, currency)
	buf = append(buf, AlignRight...)
	buf = append(buf, BoldOn...)
	buf = append(buf, []byte(totalStr)...)
	buf = append(buf, LineFeed...)
	buf = append(buf, BoldOff...)


	if payload.Notes != "" {
		buf = append(buf, AlignLeft...)
		buf = append(buf, LineFeed...)
		buf = append(buf, []byte(payload.Notes)...)
		buf = append(buf, LineFeed...)
	}


	buf = append(buf, FeedAndCut...)

	return buf
}

func separator() string {
	return strings.Repeat("-", printWidth)
}

func formatItemLine(item TicketItem) string {
	left := fmt.Sprintf("%dx %s", item.Quantity, item.Name)
	right := item.Total

	padding := printWidth - len(left) - len(right)
	if padding < 1 {
		padding = 1
	}

	return left + strings.Repeat(" ", padding) + right
}
