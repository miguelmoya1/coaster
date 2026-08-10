package escpos

import (
	"bytes"
	"strings"
	"testing"
)

func newTestRenderer() *Renderer {
	return NewRenderer(Width58mm, CP858)
}

func TestRender_OrderType(t *testing.T) {
	payload := TicketPayload{
		Type:              "order",
		EstablishmentName: "Establishment Central",
		Table:             "5",
		Date:              "2025-01-15 20:30",
		Items: []TicketItem{
			{Name: "Negroni", Quantity: 2, Price: "6.00", Total: "12.00"},
			{Name: "Cerveza", Quantity: 1, Price: "3.50", Total: "3.50"},
		},
		Total:    "15.50",
		Currency: "EUR",
		Notes:    "Sin hielo",
	}

	result := newTestRenderer().Render(payload)

	if !bytes.HasPrefix(result, Init) {
		t.Error("expected result to start with Init command")
	}
	if !bytes.HasSuffix(result, FeedAndCut) {
		t.Error("expected result to end with FeedAndCut command")
	}

	for _, want := range []string{"Establishment Central", "Mesa: 5", "Fecha: 2025-01-15 20:30", "Negroni", "Cerveza", "TOTAL: 15.50 EUR", "Sin hielo", strings.Repeat("-", Width58mm)} {
		if !bytes.Contains(result, []byte(want)) {
			t.Errorf("expected result to contain %q", want)
		}
	}

	if !bytes.Contains(result, AlignCenter) {
		t.Error("expected result to contain center align command")
	}
	if !bytes.Contains(result, BoldOn) {
		t.Error("expected result to contain bold on command")
	}
}

func TestRender_SelectsCodePageAfterInit(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{Type: "order", EstablishmentName: "Establishment"})

	want := append(append([]byte{}, Init...), SelectCodePage(CP858.Command)...)
	if !bytes.HasPrefix(result, want) {
		t.Errorf("expected Init immediately followed by ESC t %d, got % x", CP858.Command, result[:8])
	}
}

func TestRender_UnitPriceShownOnlyForMultiples(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{
		Type: "order",
		Items: []TicketItem{
			{Name: "Negroni", Quantity: 2, Price: "6.00", Total: "12.00"},
			{Name: "Cerveza", Quantity: 1, Price: "3.50", Total: "3.50"},
		},
	})

	if !bytes.Contains(result, []byte("2x Negroni (6.00)")) {
		t.Error("expected unit price for a quantity above one")
	}
	if bytes.Contains(result, []byte("(3.50)")) {
		t.Error("did not expect a unit price for a single unit")
	}
}

func TestRender_RawType(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{Type: "raw", RawText: "Hello raw world"})

	if !bytes.HasPrefix(result, Init) {
		t.Error("expected raw ticket to start with Init")
	}
	if !bytes.Contains(result, []byte("Hello raw world")) {
		t.Error("expected raw ticket to contain raw text")
	}
	if !bytes.HasSuffix(result, FeedAndCut) {
		t.Error("expected raw ticket to end with FeedAndCut")
	}
}

func TestRender_DefaultCurrency(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{Type: "order", EstablishmentName: "Test Establishment", Total: "10.00"})
	if !bytes.Contains(result, []byte("TOTAL: 10.00 EUR")) {
		t.Error("expected default EUR currency")
	}
}

func TestRender_NoTableNoDate(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{Type: "order", EstablishmentName: "Test", Total: "0.00"})

	if bytes.Contains(result, []byte("Mesa:")) {
		t.Error("should not contain table when empty")
	}
	if bytes.Contains(result, []byte("Fecha:")) {
		t.Error("should not contain date when empty")
	}
}

func TestRender_SkipsEmptyHeader(t *testing.T) {
	result := newTestRenderer().Render(TicketPayload{Type: "order", Total: "0.00"})

	if bytes.Contains(result, DoubleHeight) {
		t.Error("expected no header block when the establishment name is empty")
	}
}

func TestRender_WidthIsConfigurable(t *testing.T) {
	result := NewRenderer(Width80mm, CP858).Render(TicketPayload{Type: "order", Total: "1.00"})

	if !bytes.Contains(result, []byte(strings.Repeat("-", Width80mm))) {
		t.Errorf("expected an %d character separator", Width80mm)
	}
}

func TestItemLines_AlignsToTheMargin(t *testing.T) {
	lines := newTestRenderer().itemLines(TicketItem{Name: "Negroni", Quantity: 2, Total: "12.00"})

	if len(lines) != 1 {
		t.Fatalf("expected a single line, got %d: %q", len(lines), lines)
	}
	if len(lines[0]) != Width58mm {
		t.Errorf("expected line width %d, got %d: %q", Width58mm, len(lines[0]), lines[0])
	}
	if !strings.HasPrefix(lines[0], "2x Negroni") {
		t.Errorf("expected line to start with the description, got %q", lines[0])
	}
	if !strings.HasSuffix(lines[0], "12.00") {
		t.Errorf("expected line to end with the amount, got %q", lines[0])
	}
}

func TestItemLines_AccentsDoNotShiftTheAmount(t *testing.T) {
	r := newTestRenderer()

	plain := r.itemLines(TicketItem{Name: "Jamon serrano", Quantity: 1, Total: "6.50"})[0]
	accented := r.itemLines(TicketItem{Name: "Jamón serrano", Quantity: 1, Total: "6.50"})[0]

	if len([]rune(plain)) != len([]rune(accented)) {
		t.Errorf("accented line has a different printed width: %q (%d) vs %q (%d)",
			plain, len([]rune(plain)), accented, len([]rune(accented)))
	}
}

func TestItemLines_WrapsLongDescriptions(t *testing.T) {
	lines := newTestRenderer().itemLines(TicketItem{
		Name:     "Bocadillo de jamon serrano con tomate y aceite",
		Quantity: 1,
		Total:    "15.00",
	})

	if len(lines) < 2 {
		t.Fatalf("expected the description to wrap, got %q", lines)
	}
	for _, line := range lines {
		if len([]rune(line)) > Width58mm {
			t.Errorf("line exceeds paper width: %q (%d)", line, len([]rune(line)))
		}
	}
	if !strings.HasSuffix(lines[len(lines)-1], "15.00") {
		t.Errorf("expected the amount on the last line, got %q", lines)
	}
}

func TestWrap_HardSplitsUnbrokenText(t *testing.T) {
	lines := wrap(strings.Repeat("A", 70), 32)

	if len(lines) != 3 {
		t.Fatalf("expected 3 lines, got %d: %q", len(lines), lines)
	}
	for _, line := range lines {
		if len(line) > 32 {
			t.Errorf("line exceeds width: %q", line)
		}
	}
}

func TestTryParsePayload(t *testing.T) {
	tests := []struct {
		name string
		data string
		want bool
	}{
		{"valid", `{"type":"order","establishmentName":"Test","items":[],"total":"0.00"}`, true},
		{"missing type", `{"establishmentName":"Test"}`, false},
		{"invalid json", `not json at all`, false},
		{"plain text", "Hello, this is plain text content for the printer", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			payload, ok := TryParsePayload([]byte(tc.data))
			if ok != tc.want {
				t.Fatalf("expected ok=%v, got %v", tc.want, ok)
			}
			if ok && payload.Type != "order" {
				t.Errorf("expected type 'order', got %q", payload.Type)
			}
		})
	}
}
