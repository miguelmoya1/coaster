package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// CashCloseRepository keeps the closes of the till and reads the orders they count. Finders
// return nil with a nil error when there is nothing. The closes it returns come without
// ExpectedCash and Difference, which the service works out.
type CashCloseRepository interface {
	// ListRecent lists the establishment's last 60 closes, the latest first.
	ListRecent(ctx context.Context, establishmentID string) ([]domain.CashClose, error)
	FindTill(ctx context.Context, establishmentID string) (domain.CashCloseTill, error)
	// Close closes the till in one transaction, with the establishment locked: the close
	// starts where the previous one ended and counts every closed and cancelled order no
	// close has counted yet. An establishment that does not exist is ESTABLISHMENT_NOT_FOUND.
	Close(ctx context.Context, input domain.NewCashClose) (domain.CashClose, error)
}
