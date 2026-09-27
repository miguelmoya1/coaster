package domain

import (
	"encoding/json"
	"fmt"
	"reflect"
	"slices"
	"testing"
)

// The cases of order-pricing.tax.spec.ts and tax-rates.spec.ts in @coaster/common.

func pricingItem(id string, price, taxRate int) PricingItem {
	return PricingItem{ID: id, PriceAtPurchase: price, Quantity: 1, TaxRate: taxRate}
}

func orderDiscount(adjustmentType AdjustmentType, value int) PricingAdjustment {
	return PricingAdjustment{ID: "d", Target: AdjustmentOrder, Type: adjustmentType, Value: value}
}

func price(items []PricingItem, adjustments ...PricingAdjustment) Pricing {
	return CalculatePricing(PricingInput{Items: items, Adjustments: adjustments})
}

func TestTaxOf(t *testing.T) {
	tests := []struct {
		net, rate, tax, gross int
	}{
		{net: 100, rate: 1000, tax: 10, gross: 110},
		{net: 1000, rate: 2100, tax: 210, gross: 1210},
		{net: 500, rate: 0, tax: 0, gross: 500},
		{net: 33, rate: 2100, tax: 7, gross: 40},
		// 0.5 cents goes up, like Math.round.
		{net: 5, rate: 1000, tax: 1, gross: 6},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%d at %d", tt.net, tt.rate), func(t *testing.T) {
			if got := TaxOf(tt.net, tt.rate); got != tt.tax {
				t.Errorf("TaxOf = %d, want %d", got, tt.tax)
			}
			if got := GrossFromNet(tt.net, tt.rate); got != tt.gross {
				t.Errorf("GrossFromNet = %d, want %d", got, tt.gross)
			}
		})
	}
}

func TestRoundJS(t *testing.T) {
	tests := map[float64]int{2.5: 3, 2.49: 2, -2.5: -2, -2.51: -3, 0.5: 1, -0.5: 0}
	for x, want := range tests {
		if got := roundJS(x); got != want {
			t.Errorf("roundJS(%v) = %d, want %d", x, got, want)
		}
	}
}

func TestCalculatePricingAddsTheTaxOnTop(t *testing.T) {
	got := price([]PricingItem{pricingItem("a", 100, 1000)})
	if got.NetTotal != 100 || got.TaxAmountTotal != 10 || got.OrderTotal != 110 {
		t.Errorf("net %d, tax %d, total %d; want 100, 10, 110", got.NetTotal, got.TaxAmountTotal, got.OrderTotal)
	}

	three := PricingItem{ID: "a", PriceAtPurchase: 200, Quantity: 3, TaxRate: 2100}
	got = price([]PricingItem{three})
	if got.NetTotal != 600 || got.TaxAmountTotal != 126 || got.OrderTotal != 726 {
		t.Errorf("net %d, tax %d, total %d; want 600, 126, 726", got.NetTotal, got.TaxAmountTotal, got.OrderTotal)
	}
}

func TestCalculatePricingTotalIsBasePlusTax(t *testing.T) {
	for _, net := range []int{1, 7, 13, 99, 123, 217, 1499, 100003} {
		got := price([]PricingItem{pricingItem("a", net, 2100)})
		if got.TaxBaseTotal+got.TaxAmountTotal != got.OrderTotal || got.TaxBaseTotal != got.NetTotal {
			t.Errorf("net %d: base %d + tax %d != total %d, or base != net %d",
				net, got.TaxBaseTotal, got.TaxAmountTotal, got.OrderTotal, got.NetTotal)
		}
	}
}

func TestCalculatePricingLineGross(t *testing.T) {
	got := price([]PricingItem{{ID: "a", PriceAtPurchase: 100, Quantity: 2, TaxRate: 2100}})
	if line := got.ItemLines[0]; line.FinalTotal != 200 || line.GrossTotal != 242 {
		t.Errorf("line = %+v, want finalTotal 200 and grossTotal 242", line)
	}
}

func TestCalculatePricingOneLinePerRate(t *testing.T) {
	got := price([]PricingItem{pricingItem("food", 1000, 1000), pricingItem("bottle", 1000, 2100)})

	want := []TaxLine{{TaxRate: 1000, TaxBase: 1000, TaxAmount: 100}, {TaxRate: 2100, TaxBase: 1000, TaxAmount: 210}}
	if !reflect.DeepEqual(got.TaxBreakdown, want) || got.OrderTotal != 2310 {
		t.Errorf("breakdown = %+v, total %d; want %+v, 2310", got.TaxBreakdown, got.OrderTotal, want)
	}
}

func TestCalculatePricingTaxesEachRateOnItsSummedBase(t *testing.T) {
	var items []PricingItem
	for i := range 7 {
		items = append(items, pricingItem(fmt.Sprintf("i%d", i), 33, 2100))
	}

	got := price(items)
	if got.NetTotal != 231 || got.TaxAmountTotal != 49 || got.OrderTotal != 280 {
		t.Errorf("net %d, tax %d, total %d; want 231, 49, 280", got.NetTotal, got.TaxAmountTotal, got.OrderTotal)
	}
}

func TestCalculatePricingTipIsOutsideTheBase(t *testing.T) {
	got := CalculatePricing(PricingInput{Items: []PricingItem{pricingItem("a", 1000, 1000)}, TipAmount: 500})
	if got.NetTotal != 1000 || got.TaxAmountTotal != 100 || got.OrderTotal != 1100 || got.PayableTotal != 1600 {
		t.Errorf("got %+v", got)
	}
}

func TestCalculatePricingDiscountsTheNet(t *testing.T) {
	got := price([]PricingItem{pricingItem("a", 1000, 1000)}, orderDiscount(AdjustmentFixedAmount, 200))
	if got.NetTotal != 800 || got.TaxAmountTotal != 80 || got.OrderTotal != 880 {
		t.Errorf("net %d, tax %d, total %d; want 800, 80, 880", got.NetTotal, got.TaxAmountTotal, got.OrderTotal)
	}
}

func TestCalculatePricingSpreadsTheOrderDiscount(t *testing.T) {
	got := price(
		[]PricingItem{pricingItem("food", 1000, 1000), pricingItem("bottle", 1000, 2100)},
		orderDiscount(AdjustmentFixedAmount, 200),
	)

	var bases []int
	for _, line := range got.TaxBreakdown {
		bases = append(bases, line.TaxBase)
	}
	if !slices.Equal(bases, []int{900, 900}) || got.TaxBaseTotal != got.NetTotal {
		t.Errorf("bases = %v, base total %d, net %d; want [900 900] and base = net", bases, got.TaxBaseTotal, got.NetTotal)
	}
}

func TestCalculatePricingRoundingCentGoesToTheHeaviestRate(t *testing.T) {
	got := price(
		[]PricingItem{pricingItem("small", 100, 1000), pricingItem("big", 900, 2100)},
		orderDiscount(AdjustmentFixedAmount, 333),
	)

	if got.TaxBaseTotal != got.NetTotal || got.TaxBaseTotal+got.TaxAmountTotal != got.OrderTotal {
		t.Errorf("got %+v", got)
	}
}

func TestCalculatePricingIgnoresTheItemOrder(t *testing.T) {
	items := []PricingItem{pricingItem("a", 733, 1000), pricingItem("b", 733, 2100), pricingItem("c", 411, 1000)}
	discount := orderDiscount(AdjustmentPercentage, 17)

	reversed := slices.Clone(items)
	slices.Reverse(reversed)

	if a, b := price(items, discount).TaxBreakdown, price(reversed, discount).TaxBreakdown; !reflect.DeepEqual(a, b) {
		t.Errorf("breakdown depends on the order: %+v vs %+v", a, b)
	}
}

func TestCalculatePricingItemDiscount(t *testing.T) {
	itemID := "a"
	got := price(
		[]PricingItem{pricingItem("a", 1000, 1000)},
		PricingAdjustment{ID: "d", Target: AdjustmentItem, ItemID: &itemID, Type: AdjustmentFixedAmount, Value: 100},
	)

	if got.NetTotal != 900 || got.OrderTotal != 990 {
		t.Errorf("net %d, total %d; want 900, 990", got.NetTotal, got.OrderTotal)
	}
}

func TestCalculatePricingEmptyOrWipedOut(t *testing.T) {
	empty := price(nil)
	if empty.OrderTotal != 0 || empty.TaxBreakdown == nil || len(empty.TaxBreakdown) != 0 {
		t.Errorf("empty = %+v, want a zero total and an empty (not nil) breakdown", empty)
	}
	if got, _ := json.Marshal(empty.TaxBreakdown); string(got) != "[]" {
		t.Errorf("empty breakdown JSON = %s, want []", got)
	}

	wiped := price([]PricingItem{pricingItem("a", 500, 1000)}, orderDiscount(AdjustmentFixedAmount, 500))
	if wiped.NetTotal != 0 || wiped.OrderTotal != 0 || len(wiped.TaxBreakdown) != 0 {
		t.Errorf("wiped = %+v, want nothing to charge", wiped)
	}
}

func TestCalculatePricingZeroRate(t *testing.T) {
	got := price([]PricingItem{pricingItem("a", 1000, 0)})

	want := []TaxLine{{TaxRate: 0, TaxBase: 1000, TaxAmount: 0}}
	if got.OrderTotal != 1000 || !reflect.DeepEqual(got.TaxBreakdown, want) {
		t.Errorf("total %d, breakdown %+v; want 1000, %+v", got.OrderTotal, got.TaxBreakdown, want)
	}
}

func TestCalculatePricingSettlesAgainstTheGross(t *testing.T) {
	got := CalculatePricing(PricingInput{Items: []PricingItem{pricingItem("a", 1000, 1000)}, AmountPaidCash: 1000})
	if got.PendingAmount != 100 || got.IsFullyPaid {
		t.Errorf("pending %d, fully paid %v; want 100, false", got.PendingAmount, got.IsFullyPaid)
	}
}

func TestCalculatePricingCapsDiscounts(t *testing.T) {
	itemID := "a"
	got := price(
		[]PricingItem{pricingItem("a", 100, 1000), pricingItem("b", 100, 1000)},
		PricingAdjustment{ID: "d1", Target: AdjustmentItem, ItemID: &itemID, Type: AdjustmentFixedAmount, Value: 150},
		orderDiscount(AdjustmentPercentage, 90),
	)

	// The line discount stops at the line; the order discount (90 % of 200 = 180) stops at
	// what is left after the line discounts (100).
	if got.ItemDiscountsTotal != 100 || got.OrderDiscountsTotal != 100 || got.NetTotal != 0 {
		t.Errorf("item discounts %d, order discounts %d, net %d; want 100, 100, 0",
			got.ItemDiscountsTotal, got.OrderDiscountsTotal, got.NetTotal)
	}
}
