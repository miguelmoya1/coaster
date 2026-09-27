package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// In-memory fakes of the ports of cash closes and stats.

// fakeCashCloseRepository answers with what the test put in it and remembers the close it
// was asked for.
type fakeCashCloseRepository struct {
	recent   []domain.CashClose
	last     *domain.LastCashClose
	unclosed []domain.CashCloseOrder
	charges  []domain.OpenOrderCharge
	closed   domain.CashClose
	err      error

	establishmentIDs []string
	closeInput       *domain.NewCashClose
}

func (f *fakeCashCloseRepository) ListRecent(_ context.Context, establishmentID string) ([]domain.CashClose, error) {
	f.establishmentIDs = append(f.establishmentIDs, establishmentID)
	return f.recent, f.err
}

func (f *fakeCashCloseRepository) FindLast(_ context.Context, establishmentID string) (*domain.LastCashClose, error) {
	f.establishmentIDs = append(f.establishmentIDs, establishmentID)
	return f.last, f.err
}

func (f *fakeCashCloseRepository) FindUnclosedOrders(_ context.Context, establishmentID string) ([]domain.CashCloseOrder, error) {
	f.establishmentIDs = append(f.establishmentIDs, establishmentID)
	return f.unclosed, f.err
}

func (f *fakeCashCloseRepository) FindOpenOrdersCharges(_ context.Context, establishmentID string) ([]domain.OpenOrderCharge, error) {
	f.establishmentIDs = append(f.establishmentIDs, establishmentID)
	return f.charges, f.err
}

func (f *fakeCashCloseRepository) Close(_ context.Context, input domain.NewCashClose) (domain.CashClose, error) {
	f.closeInput = &input
	if f.err != nil {
		return domain.CashClose{}, f.err
	}

	closed := f.closed
	closed.EstablishmentID = input.EstablishmentID
	closed.ClosedByID = input.ClosedByID
	closed.OpeningFloat = input.OpeningFloat
	closed.CountedCash = input.CountedCash
	closed.Notes = input.Notes
	return closed, nil
}

// fakeStatsRepository keeps closed orders and gives those created at since or later, like
// the database.
type fakeStatsRepository struct {
	orders []domain.StatsOrder
	err    error

	establishmentID string
	since           time.Time
}

func (f *fakeStatsRepository) FindClosedOrders(_ context.Context, establishmentID string, since time.Time) ([]domain.StatsOrder, error) {
	f.establishmentID = establishmentID
	f.since = since

	var found []domain.StatsOrder
	for _, order := range f.orders {
		if !order.CreatedAt.Before(since) {
			found = append(found, order)
		}
	}
	return found, f.err
}
