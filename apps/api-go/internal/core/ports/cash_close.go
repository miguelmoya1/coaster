package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type CashCloseRepository interface {
	ListRecent(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	FindTill(ctx context.Context, establishmentID string) (domain.CashCloseTill, error)

	Close(ctx context.Context, input domain.NewCashClose) (domain.CashClose, error)
}

type CashCloseService interface {
	List(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	Preview(ctx context.Context, establishmentID string) (domain.CashClosePreview, error)
	Close(ctx context.Context, establishmentID, closedByID string, input domain.CloseCashInput) (domain.CashClose, error)
}
