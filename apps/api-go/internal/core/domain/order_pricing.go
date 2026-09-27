package domain

import (
	"math"
	"sort"
)

// TaxOf is taxOf in @coaster/common: the tax of a net amount in cents, rounded to whole
// cents. The rate is in basis points.
func TaxOf(netAmount, taxRate int) int {
	return roundJS(float64(netAmount*taxRate) / 10000)
}

// GrossFromNet is grossFromNet in @coaster/common: the net amount plus its tax.
func GrossFromNet(netAmount, taxRate int) int {
	return netAmount + TaxOf(netAmount, taxRate)
}

// roundJS is JavaScript's Math.round: halves go up (2.5 → 3, -2.5 → -2). Go's math.Round
// sends -2.5 to -3, so the totals could drift from Nest's by a cent.
func roundJS(x float64) int {
	return int(math.Floor(x + 0.5))
}

// PricingItem is PricingItemInput: an order line. Prices are net, in cents.
type PricingItem struct {
	ID              string
	PriceAtPurchase int
	Quantity        int
	PaidQuantity    int
	TaxRate         int
}

// PricingAdjustment is PricingAdjustmentInput: a discount on the order or, with ItemID,
// on one line.
type PricingAdjustment struct {
	ID     string
	Target AdjustmentTarget
	Type   AdjustmentType
	Value  int
	ItemID *string
}

// PricingInput is PricingInput: everything the totals of an order depend on.
type PricingInput struct {
	Items          []PricingItem
	Adjustments    []PricingAdjustment
	TipAmount      int
	AmountPaidCash int
	AmountPaidCard int
}

// PricingItemLine is PricingItemOutput: the totals of one line.
type PricingItemLine struct {
	ID              string
	BaseTotal       int
	DiscountsAmount int
	FinalTotal      int
	GrossTotal      int
	PaidQuantity    int
	TaxRate         int
}

// TaxLine is OrderTaxLine in @coaster/common: the base and tax of one rate.
type TaxLine struct {
	TaxRate   int `json:"taxRate"`
	TaxBase   int `json:"taxBase"`
	TaxAmount int `json:"taxAmount"`
}

// Pricing is PricingOutput: the totals of an order. TaxBreakdown is never nil, so it is
// written as [] like in Nest.
type Pricing struct {
	ItemLines           []PricingItemLine
	ItemsSubtotal       int
	ItemDiscountsTotal  int
	OrderDiscountsTotal int
	OrderTotal          int
	TipAmount           int
	PayableTotal        int
	AmountPaid          int
	AmountPaidCash      int
	AmountPaidCard      int
	PendingAmount       int
	IsFullyPaid         bool
	NetTotal            int
	TaxBreakdown        []TaxLine
	TaxBaseTotal        int
	TaxAmountTotal      int
}

// CalculatePricing is OrderPricingEngine.calculate. Prices are net: line discounts come
// off each line, the order discount is spread over the rates in proportion to their net
// (the rounding cent goes to the heaviest rate), and the tax is added on top of each
// rate's base. The tip is outside the base and the tax.
func CalculatePricing(input PricingInput) Pricing {
	itemsSubtotal := 0
	itemDiscountsTotal := 0
	itemLines := make([]PricingItemLine, 0, len(input.Items))

	for _, item := range input.Items {
		baseTotal := item.Quantity * item.PriceAtPurchase
		itemsSubtotal += baseTotal

		discountsAmount := 0
		for _, adj := range input.Adjustments {
			if adj.Target != AdjustmentItem || adj.ItemID == nil || *adj.ItemID != item.ID {
				continue
			}
			switch adj.Type {
			case AdjustmentPercentage:
				discountsAmount += roundJS(float64(baseTotal*adj.Value) / 100)
			case AdjustmentFixedAmount:
				discountsAmount += adj.Value
			}
		}

		discountsAmount = min(discountsAmount, baseTotal)
		itemDiscountsTotal += discountsAmount

		finalTotal := baseTotal - discountsAmount
		itemLines = append(itemLines, PricingItemLine{
			ID:              item.ID,
			BaseTotal:       baseTotal,
			DiscountsAmount: discountsAmount,
			FinalTotal:      finalTotal,
			GrossTotal:      GrossFromNet(finalTotal, item.TaxRate),
			PaidQuantity:    item.PaidQuantity,
			TaxRate:         item.TaxRate,
		})
	}

	orderDiscountsTotal := 0
	orderBaseForDiscount := itemsSubtotal - itemDiscountsTotal
	for _, adj := range input.Adjustments {
		if adj.Target != AdjustmentOrder {
			continue
		}
		switch adj.Type {
		case AdjustmentPercentage:
			orderDiscountsTotal += roundJS(float64(itemsSubtotal*adj.Value) / 100)
		case AdjustmentFixedAmount:
			orderDiscountsTotal += adj.Value
		}
	}
	orderDiscountsTotal = min(orderDiscountsTotal, orderBaseForDiscount)

	netTotal := max(0, itemsSubtotal-itemDiscountsTotal-orderDiscountsTotal)

	netByRate := map[int]int{}
	for _, line := range itemLines {
		netByRate[line.TaxRate] += line.FinalTotal
	}
	rates := make([]int, 0, len(netByRate))
	for rate := range netByRate {
		rates = append(rates, rate)
	}
	sort.Ints(rates)

	type rateShare struct {
		rate, net, share int
	}
	shares := make([]rateShare, 0, len(rates))
	distributed := 0
	for _, rate := range rates {
		net := netByRate[rate]
		share := 0
		if orderBaseForDiscount > 0 {
			share = roundJS(float64(orderDiscountsTotal*net) / float64(orderBaseForDiscount))
		}
		shares = append(shares, rateShare{rate: rate, net: net, share: share})
		distributed += share
	}

	if len(shares) > 0 {
		heaviest := 0
		for i, entry := range shares {
			winner := shares[heaviest]
			if entry.net > winner.net || (entry.net == winner.net && entry.rate > winner.rate) {
				heaviest = i
			}
		}
		shares[heaviest].share += orderDiscountsTotal - distributed
	}

	taxBreakdown := []TaxLine{}
	taxBaseTotal := 0
	taxAmountTotal := 0
	for _, entry := range shares {
		taxBase := max(0, entry.net-entry.share)
		if taxBase <= 0 {
			continue
		}
		line := TaxLine{TaxRate: entry.rate, TaxBase: taxBase, TaxAmount: TaxOf(taxBase, entry.rate)}
		taxBreakdown = append(taxBreakdown, line)
		taxBaseTotal += line.TaxBase
		taxAmountTotal += line.TaxAmount
	}

	orderTotal := taxBaseTotal + taxAmountTotal
	payableTotal := orderTotal + input.TipAmount
	amountPaid := input.AmountPaidCash + input.AmountPaidCard
	pendingAmount := max(0, payableTotal-amountPaid)

	return Pricing{
		ItemLines:           itemLines,
		ItemsSubtotal:       itemsSubtotal,
		ItemDiscountsTotal:  itemDiscountsTotal,
		OrderDiscountsTotal: orderDiscountsTotal,
		OrderTotal:          orderTotal,
		TipAmount:           input.TipAmount,
		PayableTotal:        payableTotal,
		AmountPaid:          amountPaid,
		AmountPaidCash:      input.AmountPaidCash,
		AmountPaidCard:      input.AmountPaidCard,
		PendingAmount:       pendingAmount,
		IsFullyPaid:         pendingAmount <= 0,
		NetTotal:            netTotal,
		TaxBreakdown:        taxBreakdown,
		TaxBaseTotal:        taxBaseTotal,
		TaxAmountTotal:      taxAmountTotal,
	}
}
