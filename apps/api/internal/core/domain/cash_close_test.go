package domain

import (
	"strings"
	"testing"
)

func cashCloseBeer() PricingItem {
	return PricingItem{ID: "item-1", PriceAtPurchase: 1000, Quantity: 2, PaidQuantity: 0, TaxRate: 1000}
}

func cashCloseOrder(change func(*CashCloseOrder)) CashCloseOrder {
	order := CashCloseOrder{Status: OrderClosed, Items: []PricingItem{cashCloseBeer()}}
	if change != nil {
		change(&order)
	}
	return order
}

func TestCashCloseTotalsOfNothing(t *testing.T) {
	if got := CashCloseTotalsOf(nil); got != (CashCloseTotals{}) {
		t.Errorf("totals = %+v, want zeros", got)
	}
}

func TestCashCloseTotalsSplitWhatWasTakenByHowItWasPaid(t *testing.T) {
	got := CashCloseTotalsOf([]CashCloseOrder{
		cashCloseOrder(func(o *CashCloseOrder) { o.AmountPaidCash = 2200 }),
		cashCloseOrder(func(o *CashCloseOrder) { o.AmountPaidCard = 2200 }),
		cashCloseOrder(func(o *CashCloseOrder) { o.AmountPaidCash, o.AmountPaidCard = 1000, 1200 }),
	})

	if got.ClosedOrders != 3 || got.CashAmount != 3200 || got.CardAmount != 3400 {
		t.Errorf("totals = %+v, want 3 orders, 3200 cash and 3400 card", got)
	}
}

func TestCashCloseTotalsCountTipsFromPaidOrdersOnly(t *testing.T) {
	got := CashCloseTotalsOf([]CashCloseOrder{
		cashCloseOrder(func(o *CashCloseOrder) { o.AmountPaidCash, o.TipAmount = 2500, 300 }),
		cashCloseOrder(func(o *CashCloseOrder) { o.Status, o.TipAmount = OrderCancelled, 500 }),
	})

	if got.TipAmount != 300 {
		t.Errorf("tips = %d, want 300", got.TipAmount)
	}
}

func TestCashCloseTotalsValueACancelledOrderAtWhatTheCustomerWouldHavePaid(t *testing.T) {
	got := CashCloseTotalsOf([]CashCloseOrder{
		cashCloseOrder(func(o *CashCloseOrder) {
			o.Status = OrderCancelled
			o.Adjustments = []PricingAdjustment{{ID: "adj-1", Target: AdjustmentOrder, Type: AdjustmentPercentage, Value: 50}}
		}),
	})

	if got.CancelledOrders != 1 || got.CancelledAmount != 1100 {
		t.Errorf("totals = %+v, want 1 cancelled worth 1100", got)
	}
}

func TestCashCloseTotalsLeaveOutACancelledOrderWithoutLines(t *testing.T) {
	got := CashCloseTotalsOf([]CashCloseOrder{
		cashCloseOrder(func(o *CashCloseOrder) { o.Status, o.Items = OrderCancelled, nil }),
	})

	if got.CancelledOrders != 0 || got.CancelledAmount != 0 {
		t.Errorf("totals = %+v, want nothing cancelled", got)
	}
}

func TestCashCloseTotalsKeepMoneyChargedOnACancelledOrder(t *testing.T) {
	got := CashCloseTotalsOf([]CashCloseOrder{
		cashCloseOrder(func(o *CashCloseOrder) { o.Status, o.AmountPaidCash = OrderCancelled, 1100 }),
	})

	if got.ClosedOrders != 0 || got.CashAmount != 1100 {
		t.Errorf("totals = %+v, want no closed orders and 1100 cash", got)
	}
}

var cashCloseFixtures = map[string]CashCloseOrder{
	"A": {
		Status: OrderClosed, AmountPaidCash: 3000, AmountPaidCard: 1000, TipAmount: 200,
		Items: []PricingItem{
			{ID: "i1", PriceAtPurchase: 1000, Quantity: 2, PaidQuantity: 2, TaxRate: 1000},
			{ID: "i2", PriceAtPurchase: 1500, Quantity: 1, PaidQuantity: 1, TaxRate: 2100},
		},
		Adjustments: []PricingAdjustment{
			{ID: "a1", Target: AdjustmentItem, Type: AdjustmentPercentage, Value: 10, ItemID: new("i2")},
			{ID: "a2", Target: AdjustmentOrder, Type: AdjustmentFixedAmount, Value: 300},
		},
	},
	"B": {
		Status: OrderCancelled, AmountPaidCash: 500, TipAmount: 150,
		Items: []PricingItem{
			{ID: "i1", PriceAtPurchase: 1000, Quantity: 2, TaxRate: 1000},
			{ID: "i2", PriceAtPurchase: 1500, Quantity: 1, TaxRate: 2100},
		},
		Adjustments: []PricingAdjustment{
			{ID: "b1", Target: AdjustmentItem, Type: AdjustmentFixedAmount, Value: 250, ItemID: new("i1")},
			{ID: "b2", Target: AdjustmentOrder, Type: AdjustmentPercentage, Value: 15},
		},
	},
	"C": {Status: OrderCancelled, AmountPaidCard: 700},
	"D": {
		Status: OrderClosed, TipAmount: 300,
		Items: []PricingItem{{ID: "d1", PriceAtPurchase: 500, Quantity: 1, TaxRate: 1000}},
	},
	"E": {
		Status: OrderCancelled,
		Items: []PricingItem{
			{ID: "e1", PriceAtPurchase: 333, Quantity: 3, TaxRate: 2100},
			{ID: "e2", PriceAtPurchase: 199, Quantity: 1, TaxRate: 1000},
		},
		Adjustments: []PricingAdjustment{
			{ID: "e3", Target: AdjustmentItem, Type: AdjustmentFixedAmount, Value: 5000, ItemID: new("e2")},
			{ID: "e4", Target: AdjustmentOrder, Type: AdjustmentPercentage, Value: 33},
		},
	},
	"F": {
		Status: OrderOpen, AmountPaidCash: 999, AmountPaidCard: 1, TipAmount: 50,
		Items: []PricingItem{{ID: "f1", PriceAtPurchase: 100, Quantity: 1, TaxRate: 1000}},
	},
}

func TestCashCloseTotalsMatchNest(t *testing.T) {
	want := map[string]CashCloseTotals{
		"A": {ClosedOrders: 1, CashAmount: 3000, CardAmount: 1000, TipAmount: 200},
		"B": {CancelledOrders: 1, CancelledAmount: 3136, CashAmount: 500},
		"C": {CardAmount: 700},
		"D": {ClosedOrders: 1, TipAmount: 300},
		"E": {CancelledOrders: 1, CancelledAmount: 731},
		"F": {CashAmount: 999, CardAmount: 1},
	}

	var all []CashCloseOrder
	for _, name := range []string{"A", "B", "C", "D", "E", "F"} {
		order := cashCloseFixtures[name]
		all = append(all, order)

		if got := CashCloseTotalsOf([]CashCloseOrder{order}); got != want[name] {
			t.Errorf("order %s: totals = %+v, want %+v", name, got, want[name])
		}
	}

	wantAll := CashCloseTotals{ClosedOrders: 2, CancelledOrders: 2, CancelledAmount: 3867, CashAmount: 4499, CardAmount: 1701, TipAmount: 500}
	if got := CashCloseTotalsOf(all); got != wantAll {
		t.Errorf("all: totals = %+v, want %+v", got, wantAll)
	}
}

func TestCashCount(t *testing.T) {
	if got := ExpectedCashOf(15000, 42050); got != 57050 {
		t.Errorf("expected cash = %d, want 57050", got)
	}

	tests := []struct {
		counted, want int
	}{
		{counted: 57050, want: 0},
		{counted: 56050, want: -1000},
		{counted: 57550, want: 500},
	}
	for _, tt := range tests {
		if got := CashDifferenceOf(tt.counted, 15000, 42050); got != tt.want {
			t.Errorf("difference with %d counted = %d, want %d", tt.counted, got, tt.want)
		}
	}
}

func TestCashCloseNotesOf(t *testing.T) {
	long := strings.Repeat("ñ", 510)

	tests := []struct {
		name  string
		notes *string
		want  *string
	}{
		{name: "no notes", notes: nil, want: nil},
		{name: "blank notes", notes: new("   \n "), want: nil},
		{name: "trimmed", notes: new("  Sin incidencias "), want: new("Sin incidencias")},
		{name: "cut to 500 characters", notes: new(long), want: new(strings.Repeat("ñ", 500))},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CashCloseNotesOf(tt.notes)
			if (got == nil) != (tt.want == nil) || (got != nil && *got != *tt.want) {
				t.Errorf("notes = %v, want %v", got, tt.want)
			}
		})
	}
}
