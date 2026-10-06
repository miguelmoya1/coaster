package domain

import (
	"maps"
	"math"
	"slices"
)

func TaxOf(netAmount, taxRate int) int {
	return roundJS(float64(netAmount*taxRate) / 10000)
}

func GrossFromNet(netAmount, taxRate int) int {
	return netAmount + TaxOf(netAmount, taxRate)
}

func roundJS(x float64) int {
	return int(math.Floor(x + 0.5))
}

type PricingItem struct {
	ID              string
	PriceAtPurchase int
	Quantity        int
	PaidQuantity    int
	TaxRate         int
}

type PricingAdjustment struct {
	ID     string
	Target AdjustmentTarget
	Type   AdjustmentType
	Value  int
	ItemID *string
}

type PricingInput struct {
	Items          []PricingItem
	Adjustments    []PricingAdjustment
	TipAmount      int
	AmountPaidCash int
	AmountPaidCard int
}

type PricingItemLine struct {
	ID              string
	BaseTotal       int
	DiscountsAmount int
	FinalTotal      int
	GrossTotal      int
	PaidQuantity    int
	TaxRate         int
}

type TaxLine struct {
	TaxRate   int `json:"taxRate"`
	TaxBase   int `json:"taxBase"`
	TaxAmount int `json:"taxAmount"`
}

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

func CalculatePricing(input PricingInput) Pricing {
	itemLines := priceItems(input.Items, input.Adjustments)

	itemsSubtotal, itemDiscountsTotal := 0, 0
	for _, line := range itemLines {
		itemsSubtotal += line.BaseTotal
		itemDiscountsTotal += line.DiscountsAmount
	}

	orderBaseForDiscount := itemsSubtotal - itemDiscountsTotal
	orderDiscountsTotal := min(orderDiscountOf(input.Adjustments, itemsSubtotal), orderBaseForDiscount)

	taxBreakdown := taxBreakdownOf(itemLines, orderDiscountsTotal, orderBaseForDiscount)
	taxBaseTotal, taxAmountTotal := 0, 0
	for _, line := range taxBreakdown {
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
		NetTotal:            max(0, orderBaseForDiscount-orderDiscountsTotal),
		TaxBreakdown:        taxBreakdown,
		TaxBaseTotal:        taxBaseTotal,
		TaxAmountTotal:      taxAmountTotal,
	}
}

func priceItems(items []PricingItem, adjustments []PricingAdjustment) []PricingItemLine {
	lines := make([]PricingItemLine, 0, len(items))
	for _, item := range items {
		baseTotal := item.Quantity * item.PriceAtPurchase
		discountsAmount := min(itemDiscountOf(item.ID, adjustments, baseTotal), baseTotal)
		finalTotal := baseTotal - discountsAmount

		lines = append(lines, PricingItemLine{
			ID:              item.ID,
			BaseTotal:       baseTotal,
			DiscountsAmount: discountsAmount,
			FinalTotal:      finalTotal,
			GrossTotal:      GrossFromNet(finalTotal, item.TaxRate),
			PaidQuantity:    item.PaidQuantity,
			TaxRate:         item.TaxRate,
		})
	}
	return lines
}

func itemDiscountOf(itemID string, adjustments []PricingAdjustment, base int) int {
	discount := 0
	for _, adj := range adjustments {
		if adj.Target == AdjustmentItem && adj.ItemID != nil && *adj.ItemID == itemID {
			discount += adj.discountOn(base)
		}
	}
	return discount
}

func orderDiscountOf(adjustments []PricingAdjustment, base int) int {
	discount := 0
	for _, adj := range adjustments {
		if adj.Target == AdjustmentOrder {
			discount += adj.discountOn(base)
		}
	}
	return discount
}

func (a PricingAdjustment) discountOn(base int) int {
	switch a.Type {
	case AdjustmentPercentage:
		return roundJS(float64(base*a.Value) / 100)
	case AdjustmentFixedAmount:
		return a.Value
	default:
		return 0
	}
}

type rateShare struct {
	rate, net, share int
}

func taxBreakdownOf(lines []PricingItemLine, orderDiscount, orderBase int) []TaxLine {
	breakdown := []TaxLine{}
	for _, entry := range orderDiscountShares(lines, orderDiscount, orderBase) {
		taxBase := max(0, entry.net-entry.share)
		if taxBase > 0 {
			breakdown = append(breakdown, TaxLine{TaxRate: entry.rate, TaxBase: taxBase, TaxAmount: TaxOf(taxBase, entry.rate)})
		}
	}
	return breakdown
}

func orderDiscountShares(lines []PricingItemLine, orderDiscount, orderBase int) []rateShare {
	netByRate := map[int]int{}
	for _, line := range lines {
		netByRate[line.TaxRate] += line.FinalTotal
	}

	shares := make([]rateShare, 0, len(netByRate))
	distributed := 0
	for _, rate := range slices.Sorted(maps.Keys(netByRate)) {
		share := 0
		if orderBase > 0 {
			share = roundJS(float64(orderDiscount*netByRate[rate]) / float64(orderBase))
		}
		shares = append(shares, rateShare{rate: rate, net: netByRate[rate], share: share})
		distributed += share
	}

	if len(shares) > 0 {
		shares[heaviestShare(shares)].share += orderDiscount - distributed
	}
	return shares
}

func heaviestShare(shares []rateShare) int {
	heaviest := 0
	for i, entry := range shares {
		winner := shares[heaviest]
		if entry.net > winner.net || (entry.net == winner.net && entry.rate > winner.rate) {
			heaviest = i
		}
	}
	return heaviest
}
