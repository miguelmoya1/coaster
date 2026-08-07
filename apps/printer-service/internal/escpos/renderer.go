package escpos

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

const (
	Width58mm = 32
	Width80mm = 48

	minimumUsableWidth = 16
)

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

type Renderer struct {
	width    int
	codePage CodePage
}

func NewRenderer(width int, codePage CodePage) *Renderer {
	if width < minimumUsableWidth {
		width = Width58mm
	}
	return &Renderer{width: width, codePage: codePage}
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

func (r *Renderer) Render(payload TicketPayload) []byte {
	if payload.Type == "raw" {
		return r.renderRaw(payload.RawText)
	}
	return r.renderOrder(payload)
}

func (r *Renderer) RenderText(text string) []byte {
	return r.renderRaw(text)
}

func (r *Renderer) renderRaw(text string) []byte {
	var buf []byte
	buf = append(buf, Init...)
	buf = append(buf, SelectCodePage(r.codePage.Command)...)
	buf = append(buf, AlignLeft...)
	buf = append(buf, r.encoded(r.clean(strings.ReplaceAll(text, "\r\n", "\n")))...)
	buf = append(buf, LineFeed...)
	buf = append(buf, FeedAndCut...)
	return buf
}

func (r *Renderer) renderOrder(payload TicketPayload) []byte {
	var buf []byte

	buf = append(buf, Init...)
	buf = append(buf, SelectCodePage(r.codePage.Command)...)

	if name := r.clean(payload.BarName); name != "" {
		buf = append(buf, AlignCenter...)
		buf = append(buf, BoldOn...)
		buf = append(buf, DoubleHeight...)
		buf = append(buf, r.encoded(name)...)
		buf = append(buf, LineFeed...)
		buf = append(buf, NormalSize...)
		buf = append(buf, BoldOff...)
	}

	buf = append(buf, AlignLeft...)
	buf = r.appendSeparator(buf)

	if table := r.clean(payload.Table); table != "" {
		buf = r.appendLine(buf, "Mesa: "+table)
	}
	if date := r.clean(payload.Date); date != "" {
		buf = r.appendLine(buf, "Fecha: "+date)
	}

	buf = r.appendSeparator(buf)

	for _, item := range payload.Items {
		for _, line := range r.itemLines(item) {
			buf = r.appendLine(buf, line)
		}
	}

	buf = r.appendSeparator(buf)

	buf = append(buf, AlignRight...)
	buf = append(buf, BoldOn...)
	buf = r.appendLine(buf, r.totalLine(payload))
	buf = append(buf, BoldOff...)
	buf = append(buf, AlignLeft...)

	if notes := r.clean(payload.Notes); notes != "" {
		buf = append(buf, LineFeed...)
		for _, line := range wrap(notes, r.width) {
			buf = r.appendLine(buf, line)
		}
	}

	return append(buf, FeedAndCut...)
}

func (r *Renderer) totalLine(payload TicketPayload) string {
	currency := r.clean(payload.Currency)
	if currency == "" {
		currency = "EUR"
	}
	return fmt.Sprintf("TOTAL: %s %s", r.clean(payload.Total), currency)
}

func (r *Renderer) appendLine(buf []byte, line string) []byte {
	buf = append(buf, r.encoded(line)...)
	return append(buf, LineFeed...)
}

func (r *Renderer) appendSeparator(buf []byte) []byte {
	return r.appendLine(buf, strings.Repeat("-", r.width))
}

func (r *Renderer) clean(s string) string {
	return r.codePage.Sanitize(strings.TrimSpace(s))
}

func (r *Renderer) encoded(s string) []byte {
	return r.codePage.Encode(s)
}

func (r *Renderer) itemLines(item TicketItem) []string {
	description := r.itemDescription(item)
	amount := r.clean(item.Total)

	if amount == "" {
		return wrap(description, r.width)
	}

	if printedWidth(description)+1+printedWidth(amount) <= r.width {
		return []string{alignEnds(description, amount, r.width)}
	}

	return append(wrap(description, r.width), alignEnds("", amount, r.width))
}

func (r *Renderer) itemDescription(item TicketItem) string {
	name := r.clean(item.Name)
	if name == "" {
		name = "-"
	}

	description := fmt.Sprintf("%dx %s", item.Quantity, name)

	if unitPrice := r.clean(item.Price); item.Quantity > 1 && unitPrice != "" {
		description += fmt.Sprintf(" (%s)", unitPrice)
	}

	return description
}

func printedWidth(s string) int {
	return utf8.RuneCountInString(s)
}

func alignEnds(left, right string, width int) string {
	gap := width - printedWidth(left) - printedWidth(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

func wrap(text string, width int) []string {
	var lines []string

	for _, paragraph := range strings.Split(text, "\n") {
		words := strings.Fields(paragraph)
		if len(words) == 0 {
			lines = append(lines, "")
			continue
		}

		current := ""
		for _, word := range words {
			for printedWidth(word) > width {
				if current != "" {
					lines = append(lines, current)
					current = ""
				}
				lines = append(lines, string([]rune(word)[:width]))
				word = string([]rune(word)[width:])
			}

			switch {
			case current == "":
				current = word
			case printedWidth(current)+1+printedWidth(word) <= width:
				current += " " + word
			default:
				lines = append(lines, current)
				current = word
			}
		}
		if current != "" {
			lines = append(lines, current)
		}
	}

	return lines
}
