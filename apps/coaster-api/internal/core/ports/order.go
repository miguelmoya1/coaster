package ports

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
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

type OrderService interface {
	ListByDate(ctx context.Context, establishmentID, date string) ([]domain.Order, error)
	List(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.Order, error)
	Get(ctx context.Context, establishmentID, orderID string) (domain.Order, error)
	Create(ctx context.Context, establishmentID string, input domain.CreateOrderInput) error
	AddItems(ctx context.Context, establishmentID, orderID string, input domain.AddOrderItemsInput) error
	BulkUpdate(ctx context.Context, establishmentID, orderID string, updates []domain.OrderItemUpdate) error
	Checkout(ctx context.Context, establishmentID, orderID string, method domain.PaymentMethod) error
	Cancel(ctx context.Context, establishmentID, orderID string) error
	MoveTable(ctx context.Context, establishmentID, orderID, tableID string) error
	Merge(ctx context.Context, establishmentID string, input domain.MergeOrdersInput) error
	RemoveItem(ctx context.Context, establishmentID, orderID, itemID string) error
	Delete(ctx context.Context, establishmentID, orderID string) error
	UpdateTip(ctx context.Context, establishmentID, orderID string, tipAmount int) error
	UpdateNotes(ctx context.Context, establishmentID, orderID string, input domain.UpdateOrderNotesInput) error
	UpdateItemNotes(ctx context.Context, establishmentID, orderID, itemID string, notes *string) error
	AddAdjustment(ctx context.Context, establishmentID, orderID string, input domain.OrderAdjustmentInput) error
	RemoveAdjustment(ctx context.Context, establishmentID, orderID, adjustmentID string) error
}
