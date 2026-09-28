package domain

import (
	"strings"
	"time"
	"unicode/utf8"
)

type CashCloseTotals struct {
	ClosedOrders    int `json:"closedOrders"`
	CancelledOrders int `json:"cancelledOrders"`
	CancelledAmount int `json:"cancelledAmount"`
	CashAmount      int `json:"cashAmount"`
	CardAmount      int `json:"cardAmount"`
	TipAmount       int `json:"tipAmount"`
}

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

type CashClosePreview struct {
	CashCloseTotals
	Since             *Time `json:"since"`
	OpenOrders        int   `json:"openOrders"`
	OpenOrdersCharged int   `json:"openOrdersCharged"`
	OpeningFloat      int   `json:"openingFloat"`
}

type NewCashClose struct {
	EstablishmentID string
	ClosedByID      string
	OpeningFloat    int
	CountedCash     int
	Notes           *string
}

type LastCashClose struct {
	ClosedAt     time.Time
	OpeningFloat int
}

type CashCloseTill struct {
	Last              *LastCashClose
	UnclosedOrders    []CashCloseOrder
	OpenOrdersCharges []OpenOrderCharge
}

type OpenOrderCharge struct {
	AmountPaidCash int
	AmountPaidCard int
}

type CashCloseOrder struct {
	Status         OrderStatus
	AmountPaidCash int
	AmountPaidCard int
	TipAmount      int
	Items          []PricingItem
	Adjustments    []PricingAdjustment
}

const maxCashCloseNotes = 500

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

func ExpectedCashOf(openingFloat, cashAmount int) int {
	return openingFloat + cashAmount
}

func CashDifferenceOf(countedCash, openingFloat, cashAmount int) int {
	return countedCash - ExpectedCashOf(openingFloat, cashAmount)
}

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

type CloseCashInput struct {
	OpeningFloat int
	CountedCash  int
	Notes        *string
}
