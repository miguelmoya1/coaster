package ports

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
)

type CashCloseRepository interface {
	ListRecent(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	ListClosedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.CashClose, error)
	FindTill(ctx context.Context, establishmentID string) (domain.CashCloseTill, error)

	Close(ctx context.Context, input domain.NewCashClose) (domain.CashClose, error)
	Void(ctx context.Context, input domain.VoidCashClose) (domain.CashClose, error)
}

type CashCloseService interface {
	List(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	ListByDate(ctx context.Context, establishmentID, date string) ([]domain.CashClose, error)
	Preview(ctx context.Context, establishmentID string) (domain.CashClosePreview, error)
	Close(ctx context.Context, establishmentID, closedByID string, input domain.CloseCashInput) (domain.CashClose, error)
	Void(ctx context.Context, establishmentID, cashCloseID, voidedByID string) (domain.CashClose, error)
}
