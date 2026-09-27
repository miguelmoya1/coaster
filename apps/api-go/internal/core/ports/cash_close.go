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
	// FindLast is the establishment's latest close.
	FindLast(ctx context.Context, establishmentID string) (*domain.LastCashClose, error)
	// FindUnclosedOrders lists the closed and cancelled orders no close has counted yet.
	FindUnclosedOrders(ctx context.Context, establishmentID string) ([]domain.CashCloseOrder, error)
	// FindOpenOrdersCharges lists what was already charged on each open order.
	FindOpenOrdersCharges(ctx context.Context, establishmentID string) ([]domain.OpenOrderCharge, error)
	// Close closes the till in one transaction, with the establishment locked: the close
	// starts where the previous one ended and counts every closed and cancelled order no
	// close has counted yet.
	Close(ctx context.Context, input domain.NewCashClose) (domain.CashClose, error)
}
