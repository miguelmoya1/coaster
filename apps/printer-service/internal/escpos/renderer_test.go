package escpos

import (
	"bytes"
	"testing"
)

func TestRenderTicket_OrderType(t *testing.T) {
	payload := TicketPayload{
		Type:    "order",
		BarName: "Bar Central",
		Table:   "5",
		Date:    "2025-01-15 20:30",
		Items: []TicketItem{
			{Name: "Negroni", Quantity: 2, Price: "6.00", Total: "12.00"},
			{Name: "Cerveza", Quantity: 1, Price: "3.50", Total: "3.50"},
		},
		Total:    "15.50",
		Currency: "EUR",
		Notes:    "Sin hielo",
	}

	result := RenderTicket(payload)

	if !bytes.HasPrefix(result, Init) {
		t.Error("expected result to start with Init command")
	}

	if !bytes.HasSuffix(result, FeedAndCut) {
		t.Error("expected result to end with FeedAndCut command")
	}

	if !bytes.Contains(result, []byte("Bar Central")) {
		t.Error("expected result to contain bar name")
	}

	if !bytes.Contains(result, []byte("Mesa: 5")) {
		t.Error("expected result to contain table info")
	}

	if !bytes.Contains(result, []byte("Fecha: 2025-01-15 20:30")) {
		t.Error("expected result to contain date")
	}

	if !bytes.Contains(result, []byte("Negroni")) {
		t.Error("expected result to contain item name 'Negroni'")
	}
	if !bytes.Contains(result, []byte("Cerveza")) {
		t.Error("expected result to contain item name 'Cerveza'")
	}

	if !bytes.Contains(result, []byte("TOTAL: 15.50 EUR")) {
		t.Error("expected result to contain total")
	}

	if !bytes.Contains(result, []byte("Sin hielo")) {
		t.Error("expected result to contain notes")
	}

	if !bytes.Contains(result, []byte("--------------------------------")) {
		t.Error("expected result to contain separator line")
	}

	if !bytes.Contains(result, AlignCenter) {
		t.Error("expected result to contain center align command")
	}
	
	if !bytes.Contains(result, BoldOn) {
		t.Error("expected result to contain bold on command")
	}
}

func TestRenderTicket_RawType(t *testing.T) {
	payload := TicketPayload{
		Type:    "raw",
		RawText: "Hello raw world",
	}

	result := RenderTicket(payload)

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

func TestRenderTicket_DefaultCurrency(t *testing.T) {
	payload := TicketPayload{
		Type:    "order",
		BarName: "Test Bar",
		Items:   []TicketItem{},
		Total:   "10.00",

	}

	result := RenderTicket(payload)
	if !bytes.Contains(result, []byte("TOTAL: 10.00 EUR")) {
		t.Error("expected default EUR currency")
	}
}

func TestRenderTicket_NoTableNoDate(t *testing.T) {
	payload := TicketPayload{
		Type:    "order",
		BarName: "Test",
		Items:   []TicketItem{},
		Total:   "0.00",
	}

	result := RenderTicket(payload)
	if bytes.Contains(result, []byte("Mesa:")) {
		t.Error("should not contain table when empty")
	}
	if bytes.Contains(result, []byte("Fecha:")) {
		t.Error("should not contain date when empty")
	}
}

func TestFormatItemLine(t *testing.T) {
	item := TicketItem{Name: "Negroni", Quantity: 2, Price: "6.00", Total: "12.00"}
	line := formatItemLine(item)

	if len(line) != 32 {
		t.Errorf("expected line length 32, got %d: %q", len(line), line)
	}
	if line[:10] != "2x Negroni" {
		t.Errorf("expected line to start with '2x Negroni', got %q", line[:10])
	}
	if line[27:] != "12.00" {
		t.Errorf("expected line to end with '12.00', got %q", line[27:])
	}
}

func TestFormatItemLine_LongName(t *testing.T) {
	item := TicketItem{Name: "A Very Long Cocktail Name Here", Quantity: 1, Price: "15.00", Total: "15.00"}
	line := formatItemLine(item)

	if len(line) < 32 {
		t.Errorf("expected line >= 32 chars, got %d: %q", len(line), line)
	}
}

func TestTryParsePayload_Valid(t *testing.T) {
	data := []byte(`{"type":"order","barName":"Test","items":[],"total":"0.00"}`)
	payload, ok := TryParsePayload(data)
	if !ok {
		t.Error("expected valid parse")
	}
	if payload.Type != "order" {
		t.Errorf("expected type 'order', got %q", payload.Type)
	}
}

func TestTryParsePayload_NoType(t *testing.T) {
	data := []byte(`{"barName":"Test"}`)
	_, ok := TryParsePayload(data)
	if ok {
		t.Error("expected invalid parse when type is missing")
	}
}

func TestTryParsePayload_InvalidJSON(t *testing.T) {
	data := []byte(`not json at all`)
	_, ok := TryParsePayload(data)
	if ok {
		t.Error("expected invalid parse for non-JSON")
	}
}

func TestTryParsePayload_PlainText(t *testing.T) {
	data := []byte("Hello, this is plain text content for the printer")
	_, ok := TryParsePayload(data)
	if ok {
		t.Error("expected invalid parse for plain text")
	}
}
