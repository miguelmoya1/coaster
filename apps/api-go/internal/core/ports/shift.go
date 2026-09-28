package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type ShiftRepository interface {
	ListByEstablishment(ctx context.Context, establishmentID string, from, to *time.Time) ([]domain.Shift, error)
	FindByID(ctx context.Context, id string) (*domain.Shift, error)
	Create(ctx context.Context, input domain.NewShift) (*domain.Shift, error)
	Delete(ctx context.Context, id string) error
}

type ShiftExchangeRepository interface {
	FindByID(ctx context.Context, id string) (*domain.ShiftExchangeRecord, error)
	HasPending(ctx context.Context, shiftID string) (bool, error)

	ListPending(ctx context.Context, establishmentID string, since time.Time) ([]domain.ShiftExchange, error)

	Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error)
	Create(ctx context.Context, shiftID, requesterID string, targetID *string) error

	AcceptAndSwap(ctx context.Context, exchangeID, shiftID, userID string) (bool, error)
	Delete(ctx context.Context, id string) error
}

type ShiftExchangeService interface {
	ListPending(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error)
	Request(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error
	Accept(ctx context.Context, establishmentID, exchangeID, userID string) error
	Delete(ctx context.Context, establishmentID, exchangeID, userID string) error
}

type ShiftService interface {
	List(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error)
	Create(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error
	Delete(ctx context.Context, establishmentID, shiftID string) error
}
