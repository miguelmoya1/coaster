package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// ShiftRepository keeps the rota. Finders return nil with a nil error when there is nothing.
type ShiftRepository interface {
	// ListByEstablishment lists the shifts by start time. With from and to it keeps those
	// starting between them, both included.
	ListByEstablishment(ctx context.Context, establishmentID string, from, to *time.Time) ([]domain.Shift, error)
	FindByID(ctx context.Context, id string) (*domain.Shift, error)
	Create(ctx context.Context, input domain.NewShift) (*domain.Shift, error)
	Delete(ctx context.Context, id string) error
}

// ShiftExchangeRepository keeps the offers to hand a shift over. Finders return nil with a
// nil error when there is nothing.
type ShiftExchangeRepository interface {
	FindByID(ctx context.Context, id string) (*domain.ShiftExchangeRecord, error)
	HasPending(ctx context.Context, shiftID string) (bool, error)
	// ListPending lists the pending offers of the establishment whose shift starts at since
	// or later, by the shift's start.
	ListPending(ctx context.Context, establishmentID string, since time.Time) ([]domain.ShiftExchange, error)
	// Membership ignores memberships removed from the establishment.
	Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error)
	Create(ctx context.Context, shiftID, requesterID string, targetID *string) error
	// AcceptAndSwap approves the offer and gives the shift to userID in one transaction.
	// It returns false, and changes nothing, when the offer was no longer pending.
	AcceptAndSwap(ctx context.Context, exchangeID, shiftID, userID string) (bool, error)
	Delete(ctx context.Context, id string) error
}
