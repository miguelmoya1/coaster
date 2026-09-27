package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// CashCloseService closes the till: what was taken since the last close, how it was paid
// and how far the count is from it.
type CashCloseService struct {
	closes ports.CashCloseRepository
}

func NewCashCloseService(closes ports.CashCloseRepository) *CashCloseService {
	return &CashCloseService{closes: closes}
}

// CloseCashInput is a close as the request brings it. Amounts are in cents.
type CloseCashInput struct {
	OpeningFloat int
	CountedCash  int
	Notes        *string
}

// List lists the establishment's last 60 closes, the latest first.
func (s *CashCloseService) List(ctx context.Context, establishmentID string) ([]domain.CashClose, error) {
	closes, err := s.closes.ListRecent(ctx, establishmentID)
	if err != nil {
		return nil, err
	}

	for i := range closes {
		closes[i] = withCashCount(closes[i])
	}
	return closes, nil
}

// Preview is what closing now would count, what the open orders already charged and the
// float of the last close.
func (s *CashCloseService) Preview(ctx context.Context, establishmentID string) (domain.CashClosePreview, error) {
	last, err := s.closes.FindLast(ctx, establishmentID)
	if err != nil {
		return domain.CashClosePreview{}, err
	}

	orders, err := s.closes.FindUnclosedOrders(ctx, establishmentID)
	if err != nil {
		return domain.CashClosePreview{}, err
	}

	charges, err := s.closes.FindOpenOrdersCharges(ctx, establishmentID)
	if err != nil {
		return domain.CashClosePreview{}, err
	}

	preview := domain.CashClosePreview{
		CashCloseTotals: domain.CashCloseTotalsOf(orders),
		OpenOrders:      len(charges),
	}
	for _, charge := range charges {
		preview.OpenOrdersCharged += charge.AmountPaidCash + charge.AmountPaidCard
	}
	if last != nil {
		since := domain.NewTime(last.ClosedAt)
		preview.Since = &since
		preview.OpeningFloat = last.OpeningFloat
	}

	return preview, nil
}

// Close closes the till for closedByID with the float and the cash counted.
func (s *CashCloseService) Close(ctx context.Context, establishmentID, closedByID string, input CloseCashInput) (domain.CashClose, error) {
	closed, err := s.closes.Close(ctx, domain.NewCashClose{
		EstablishmentID: establishmentID,
		ClosedByID:      closedByID,
		OpeningFloat:    input.OpeningFloat,
		CountedCash:     input.CountedCash,
		Notes:           domain.CashCloseNotesOf(input.Notes),
	})
	if err != nil {
		return domain.CashClose{}, err
	}

	return withCashCount(closed), nil
}

// withCashCount adds what the drawer should hold and how far the count is from it, as
// CashClosesMapper does.
func withCashCount(cashClose domain.CashClose) domain.CashClose {
	cashClose.ExpectedCash = domain.ExpectedCashOf(cashClose.OpeningFloat, cashClose.CashAmount)
	cashClose.Difference = domain.CashDifferenceOf(cashClose.CountedCash, cashClose.OpeningFloat, cashClose.CashAmount)
	return cashClose
}
