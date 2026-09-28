package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type OrderRepository interface {
	ListOf(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.OrderRow, error)

	ListCreatedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.OrderRow, error)

	FindByID(ctx context.Context, orderID string) (*domain.OrderRow, error)

	FindByIDs(ctx context.Context, orderIDs []string) ([]domain.OrderRow, error)

	FindProducts(ctx context.Context, establishmentID string, productIDs []string) ([]domain.OrderProduct, error)

	Create(ctx context.Context, order domain.NewOrder) (domain.OrderRow, error)

	AddItems(ctx context.Context, orderID string, addition domain.OrderItemsAddition) (domain.OrderRow, error)

	BulkUpdate(ctx context.Context, orderID string, updates []domain.OrderItemUpdate) (domain.OrderRow, error)

	Checkout(ctx context.Context, orderID string, tableID *string, method domain.PaymentMethod) (domain.OrderRow, error)

	Cancel(ctx context.Context, orderID string, tableID *string) (domain.OrderRow, error)

	MoveTable(ctx context.Context, orderID string, oldTableID *string, newTableID, newTableName string) (domain.OrderRow, error)

	Merge(ctx context.Context, merge domain.OrderMerge) (domain.OrderRow, error)

	RemoveItem(ctx context.Context, orderID, itemID string) (domain.OrderRow, error)

	RemoveLastItemAndCancel(ctx context.Context, orderID, itemID string, tableID *string) (domain.OrderRow, error)
	Delete(ctx context.Context, orderID string) error
	UpdateNotes(ctx context.Context, orderID string, changes domain.OrderNotesChanges) (domain.OrderRow, error)
	UpdateItemNotes(ctx context.Context, orderID, itemID string, notes *string) (domain.OrderRow, error)
	UpdateTip(ctx context.Context, orderID string, tipAmount int) error
	AddAdjustment(ctx context.Context, orderID string, adjustment domain.NewOrderAdjustment) (domain.OrderRow, error)
	RemoveAdjustment(ctx context.Context, orderID, adjustmentID string) (domain.OrderRow, error)
}
