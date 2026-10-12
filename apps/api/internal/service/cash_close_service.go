package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type CashCloseService struct {
	closes ports.CashCloseRepository
}

func NewCashCloseService(closes ports.CashCloseRepository) *CashCloseService {
	return &CashCloseService{closes: closes}
}

func (s *CashCloseService) List(ctx context.Context, establishmentID string) ([]domain.CashClose, error) {
	closes, err := s.closes.ListRecent(ctx, establishmentID)
	if err != nil {
		return nil, err
	}
	return withCashCounts(closes), nil
}

func (s *CashCloseService) ListByDate(ctx context.Context, establishmentID, date string) ([]domain.CashClose, error) {
	start, ok := domain.ParseEstablishmentDay(date)
	if !ok {
		return nil, domain.BadRequest(domain.CodeInvalidDate)
	}

	closes, err := s.closes.ListClosedBetween(ctx, establishmentID, start, start.AddDate(0, 0, 1))
	if err != nil {
		return nil, err
	}
	return withCashCounts(closes), nil
}

func (s *CashCloseService) Preview(ctx context.Context, establishmentID string) (domain.CashClosePreview, error) {
	till, err := s.closes.FindTill(ctx, establishmentID)
	if err != nil {
		return domain.CashClosePreview{}, err
	}

	preview := domain.CashClosePreview{
		CashCloseTotals: domain.CashCloseTotalsOf(till.UnclosedOrders),
		OpenOrders:      len(till.OpenOrdersCharges),
	}
	for _, charge := range till.OpenOrdersCharges {
		preview.OpenOrdersCharged += charge.AmountPaidCash + charge.AmountPaidCard
	}
	if till.Last != nil {
		since := domain.NewTime(till.Last.ClosedAt)
		preview.Since = &since
		preview.OpeningFloat = till.Last.OpeningFloat
	}

	return preview, nil
}

func (s *CashCloseService) Close(ctx context.Context, establishmentID, closedByID string, input domain.CloseCashInput) (domain.CashClose, error) {
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

func (s *CashCloseService) Void(ctx context.Context, establishmentID, cashCloseID, voidedByID string) (domain.CashClose, error) {
	voided, err := s.closes.Void(ctx, domain.VoidCashClose{
		EstablishmentID: establishmentID,
		CashCloseID:     cashCloseID,
		VoidedByID:      voidedByID,
	})
	if err != nil {
		return domain.CashClose{}, err
	}

	return withCashCount(voided), nil
}

func withCashCounts(closes []domain.CashClose) []domain.CashClose {
	for i := range closes {
		closes[i] = withCashCount(closes[i])
	}
	return closes
}

func withCashCount(cashClose domain.CashClose) domain.CashClose {
	cashClose.ExpectedCash = domain.ExpectedCashOf(cashClose.OpeningFloat, cashClose.CashAmount)
	cashClose.Difference = domain.CashDifferenceOf(cashClose.CountedCash, cashClose.OpeningFloat, cashClose.CashAmount)
	return cashClose
}
