package domain

import (
	"math"
	"sort"
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
