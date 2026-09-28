package domain

import (
	"strings"
	"time"
	"unicode/utf8"
)

// CashCloseTotals is CashCloseTotals in @coaster/common: what a close of the till adds up.
// Amounts are in cents.
type CashCloseTotals struct {
	ClosedOrders    int `json:"closedOrders"`
	CancelledOrders int `json:"cancelledOrders"`
	CancelledAmount int `json:"cancelledAmount"`
	CashAmount      int `json:"cashAmount"`
	CardAmount      int `json:"cardAmount"`
	TipAmount       int `json:"tipAmount"`
}

// CashClose is CashClose in @coaster/common: a close of the till and its count.
type CashClose struct {
	ID              string `json:"id"`
	EstablishmentID string `json:"establishmentId"`
	ClosedByID      string `json:"closedById"`
	ClosedByName    string `json:"closedByName"`
	Since           *Time  `json:"since"`
	ClosedAt        Time   `json:"closedAt"`
	CashCloseTotals
	OpeningFloat int     `json:"openingFloat"`
	CountedCash  int     `json:"countedCash"`
	ExpectedCash int     `json:"expectedCash"`
	Difference   int     `json:"difference"`
	Notes        *string `json:"notes"`
}

// CashClosePreview is CashClosePreview in @coaster/common: what closing now would count.
type CashClosePreview struct {
	CashCloseTotals
	Since             *Time `json:"since"`
	OpenOrders        int   `json:"openOrders"`
	OpenOrdersCharged int   `json:"openOrdersCharged"`
	OpeningFloat      int   `json:"openingFloat"`
}

// NewCashClose is what it takes to close the till.
type NewCashClose struct {
	EstablishmentID string
	ClosedByID      string
	OpeningFloat    int
	CountedCash     int
	Notes           *string
}

// LastCashClose is what the next close takes from the previous one.
type LastCashClose struct {
	ClosedAt     time.Time
	OpeningFloat int
}

type CashCloseTill struct {
	Last              *LastCashClose
	UnclosedOrders    []CashCloseOrder
	OpenOrdersCharges []OpenOrderCharge
}

// OpenOrderCharge is what was already charged on an order that is still open.
type OpenOrderCharge struct {
	AmountPaidCash int
	AmountPaidCard int
}

// CashCloseOrder is a finished order as a close counts it (CashCloseOrder in
// cash-close-totals.ts). Its lines and discounts are already what the pricing engine reads.
type CashCloseOrder struct {
	Status         OrderStatus
	AmountPaidCash int
	AmountPaidCard int
	TipAmount      int
	Items          []PricingItem
	Adjustments    []PricingAdjustment
}

// maxCashCloseNotes is how long the notes of a close can be.
const maxCashCloseNotes = 500

// CashCloseTotalsOf is cashCloseTotalsOf. Every order counts what was charged, because the
// money is in the drawer even if the order was cancelled afterwards. Only closed orders count
// their tip, and a cancelled order counts at what the customer would have paid, tax and
// discounts included, unless it has no lines (it was merged into another or emptied).
func CashCloseTotalsOf(orders []CashCloseOrder) CashCloseTotals {
	var totals CashCloseTotals

	for _, order := range orders {
		totals.CashAmount += order.AmountPaidCash
		totals.CardAmount += order.AmountPaidCard

		switch {
		case order.Status == OrderClosed:
			totals.ClosedOrders++
			totals.TipAmount += order.TipAmount
		case order.Status == OrderCancelled && len(order.Items) > 0:
			totals.CancelledOrders++
			totals.CancelledAmount += CalculatePricing(PricingInput{Items: order.Items, Adjustments: order.Adjustments}).OrderTotal
		}
	}

	return totals
}

// ExpectedCashOf is expectedCashOf in @coaster/common: the float plus what was taken in cash.
func ExpectedCashOf(openingFloat, cashAmount int) int {
	return openingFloat + cashAmount
}

// CashDifferenceOf is cashDifferenceOf in @coaster/common: negative when cash is missing and
// positive when there is too much.
func CashDifferenceOf(countedCash, openingFloat, cashAmount int) int {
	return countedCash - ExpectedCashOf(openingFloat, cashAmount)
}

// CashCloseNotesOf trims the notes of a close and keeps at most 500 characters. Empty notes
// are nil.
func CashCloseNotesOf(notes *string) *string {
	if notes == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*notes)
	if utf8.RuneCountInString(trimmed) > maxCashCloseNotes {
		trimmed = string([]rune(trimmed)[:maxCashCloseNotes])
	}
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
