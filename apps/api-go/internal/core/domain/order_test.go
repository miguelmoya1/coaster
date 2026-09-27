package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestOrderToOrderJSON(t *testing.T) {
	createdAt := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	tableID := "t1"
	tableName := "Mesa 1"
	empty := ""
	notes := "sin hielo"
	itemID := "i1"

	row := OrderRow{
		ID:              "o1",
		EstablishmentID: "e1",
		TableID:         &tableID,
		LinkedTableName: &tableName,
		Status:          OrderOpen,
		TotalAmount:     1000,
		PaymentMethod:   PaymentNone,
		Notes:           &empty,
		TicketNotes:     &notes,
		TipAmount:       50,
		CreatedAt:       createdAt,
		UpdatedAt:       createdAt.Add(1500 * time.Millisecond),
		Items: []OrderItemRow{{
			ID: "i1", OrderID: "o1", ProductID: "p1", ProductName: "Beer", Quantity: 2, PriceAtPurchase: 500,
			TaxRateAtPurchase: 1000, PaymentStatus: PaymentPending, DeliveryStatus: DeliveryPending,
			PaymentMethod: PaymentNone, Notes: &empty, CreatedAt: createdAt, UpdatedAt: createdAt,
		}},
		Adjustments: []OrderAdjustmentRow{{
			ID: "a1", OrderID: "o1", Target: AdjustmentItem, ItemID: &itemID, Type: AdjustmentPercentage, Value: 10,
			Reason: &empty, CreatedAt: createdAt,
		}},
	}

	body, err := json.Marshal(row.ToOrder())
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"o1","establishmentId":"e1","tableId":"t1","tableName":"Mesa 1","status":"OPEN","totalAmount":1000,` +
		`"amountPaidCash":0,"amountPaidCard":0,"items":[{"id":"i1","orderId":"o1","productId":"p1","productName":"Beer",` +
		`"quantity":2,"priceAtPurchase":500,"paidQuantity":0,"paidQuantityCash":0,"paidQuantityCard":0,"servedQuantity":0,` +
		`"paymentStatus":"PENDING","deliveryStatus":"PENDING","paymentMethod":"NONE","createdAt":"2026-09-27T10:00:00Z",` +
		`"updatedAt":"2026-09-27T10:00:00Z"}],"adjustments":[{"id":"a1","orderId":"o1","target":"ITEM","itemId":"i1",` +
		`"type":"PERCENTAGE","value":10,"createdAt":"2026-09-27T10:00:00Z"}],"paymentMethod":"NONE","ticketNotes":"sin hielo",` +
		`"tipAmount":50,"netTotal":900,"taxBreakdown":[{"taxRate":1000,"taxBase":900,"taxAmount":90}],"taxAmountTotal":90,` +
		`"orderTotal":990,"payableTotal":1040,"createdAt":"2026-09-27T10:00:00Z","updatedAt":"2026-09-27T10:00:01.5Z"}`
	if string(body) != want {
		t.Errorf("JSON =\n%s\nwant\n%s", body, want)
	}
}

func TestOrderToOrderLeavesOutWhatNestLeavesOut(t *testing.T) {
	kept := "Terraza 2"
	linked := "Terraza"

	withoutTable, _ := json.Marshal(OrderRow{ID: "o1"}.ToOrder())
	want := `{"id":"o1","establishmentId":"","status":"","totalAmount":0,"amountPaidCash":0,"amountPaidCard":0,` +
		`"items":[],"adjustments":[],"paymentMethod":"","tipAmount":0,"netTotal":0,"taxBreakdown":[],"taxAmountTotal":0,` +
		`"orderTotal":0,"payableTotal":0,"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}`
	if string(withoutTable) != want {
		t.Errorf("without a table =\n%s\nwant\n%s", withoutTable, want)
	}

	order := OrderRow{TableName: &kept, LinkedTableName: &linked}.ToOrder()
	if order.TableName == nil || *order.TableName != kept {
		t.Errorf("tableName = %v, want the one kept on the order", order.TableName)
	}
}

func TestOrderItemPaidAfter(t *testing.T) {
	card := PaymentCard
	cash := PaymentCash
	mixed := PaymentMixed

	tests := []struct {
		name   string
		item   OrderItemRow
		paid   int
		method *PaymentMethod
		want   OrderItemPaid
	}{
		{"pays one of two by card", OrderItemRow{Quantity: 2}, 1, &card,
			OrderItemPaid{Quantity: 1, Card: 1, Status: PaymentPartial, Method: PaymentCard}},
		{"pays everything in cash", OrderItemRow{Quantity: 2}, 2, &cash,
			OrderItemPaid{Quantity: 2, Cash: 2, Status: PaymentPaid, Method: PaymentCash}},
		{"without a method it is cash", OrderItemRow{Quantity: 3, PaidQuantity: 1, PaidQuantityCard: 1}, 3, nil,
			OrderItemPaid{Quantity: 3, Cash: 2, Card: 1, Status: PaymentPaid, Method: PaymentMixed}},
		{"mixed goes to cash", OrderItemRow{Quantity: 3}, 1, &mixed,
			OrderItemPaid{Quantity: 1, Cash: 1, Status: PaymentPartial, Method: PaymentCash}},
		{"giving back takes card first", OrderItemRow{Quantity: 4, PaidQuantity: 4, PaidQuantityCash: 2, PaidQuantityCard: 2}, 1, nil,
			OrderItemPaid{Quantity: 1, Cash: 1, Status: PaymentPartial, Method: PaymentCash}},
		{"giving everything back", OrderItemRow{Quantity: 2, PaidQuantity: 2, PaidQuantityCard: 2}, 0, &card,
			OrderItemPaid{Quantity: 0, Status: PaymentPending, Method: PaymentNone}},
		{"a line with no units is paid", OrderItemRow{Quantity: 0}, 0, nil,
			OrderItemPaid{Quantity: 0, Status: PaymentPaid, Method: PaymentNone}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.item.PaidAfter(tt.paid, tt.method); got != tt.want {
				t.Errorf("PaidAfter = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestOrderItemPaidInFullAndServed(t *testing.T) {
	item := OrderItemRow{Quantity: 3, PaidQuantity: 1, PaidQuantityCard: 1}

	if got := item.PaidInFull(PaymentCash); got != (OrderItemPaid{Quantity: 3, Cash: 2, Card: 1, Status: PaymentPaid, Method: PaymentMixed}) {
		t.Errorf("PaidInFull(CASH) = %+v", got)
	}
	if got := item.PaidInFull(PaymentCard); got != (OrderItemPaid{Quantity: 3, Card: 3, Status: PaymentPaid, Method: PaymentCard}) {
		t.Errorf("PaidInFull(CARD) = %+v", got)
	}

	for served, want := range map[int]DeliveryStatus{0: DeliveryPending, 2: DeliveryPartial, 3: DeliveryServed} {
		if got := item.ServedAfter(served); got != want {
			t.Errorf("ServedAfter(%d) = %s, want %s", served, got, want)
		}
	}
}

func TestOrderAmountsPaidByLine(t *testing.T) {
	row := OrderRow{Items: []OrderItemRow{
		{ID: "i1", Quantity: 2, PriceAtPurchase: 500, TaxRateAtPurchase: 1000, PaidQuantity: 1, PaidQuantityCard: 1},
		{ID: "i2", Quantity: 3, PriceAtPurchase: 333, TaxRateAtPurchase: 2100, PaidQuantity: 2, PaidQuantityCash: 2},
		{ID: "i3", Quantity: 0, PriceAtPurchase: 100, TaxRateAtPurchase: 1000, PaidQuantityCash: 1},
	}}

	// 2 × 500 + 10 % = 1100, so a unit is 550. 3 × 333 + 21 % = 1209 (999 + 209.79), so two units are 806.
	cash, card := row.AmountsPaidByLine()
	if cash != 806 || card != 550 {
		t.Errorf("AmountsPaidByLine = %d cash, %d card; want 806 and 550", cash, card)
	}
}

func TestOrderAmountsAfterCheckout(t *testing.T) {
	row := OrderRow{
		AmountPaidCash: 200,
		TipAmount:      100,
		Items:          []OrderItemRow{{ID: "i1", Quantity: 1, PriceAtPurchase: 1000, TaxRateAtPurchase: 1000}},
	}

	if cash, card := row.AmountsAfterCheckout(PaymentCash); cash != 1200 || card != 0 {
		t.Errorf("in cash = %d, %d; want 1200, 0", cash, card)
	}
	if cash, card := row.AmountsAfterCheckout(PaymentCard); cash != 200 || card != 1000 {
		t.Errorf("by card = %d, %d; want 200, 1000", cash, card)
	}
}

func TestPaymentMethodForAndPercentageOf(t *testing.T) {
	methods := []struct {
		cash, card int
		want       PaymentMethod
	}{{0, 0, PaymentNone}, {1, 0, PaymentCash}, {0, 1, PaymentCard}, {1, 1, PaymentMixed}}
	for _, m := range methods {
		if got := PaymentMethodFor(m.cash, m.card); got != m.want {
			t.Errorf("PaymentMethodFor(%d, %d) = %s, want %s", m.cash, m.card, got, m.want)
		}
	}

	if got := PercentageOf(1000, 10); got != 100 {
		t.Errorf("10 %% of 1000 = %d", got)
	}
	if got := PercentageOf(5, 10); got != 1 {
		t.Errorf("10 %% of 5 = %d, want 1 (0.5 rounds up)", got)
	}
}
