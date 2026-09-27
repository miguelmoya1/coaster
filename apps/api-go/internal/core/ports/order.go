package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// OrderRepository stores the orders with their lines and discounts. Every order it returns
// comes with its lines (oldest first) and its discounts. The writes that touch more than
// one row run in one transaction, as in Nest, and return the order as it ends up. A write
// on a row that is not there fails, like a Prisma update or delete does.
type OrderRepository interface {
	// ListOf lists the establishment's orders, newest first. With a status, only those.
	ListOf(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.OrderRow, error)
	// ListCreatedBetween lists the establishment's orders created from from (included) to
	// to (excluded), newest first.
	ListCreatedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.OrderRow, error)
	// FindByID returns nil when there is no such order.
	FindByID(ctx context.Context, orderID string) (*domain.OrderRow, error)
	// FindByIDs returns the orders that exist among orderIDs, oldest first.
	FindByIDs(ctx context.Context, orderIDs []string) ([]domain.OrderRow, error)
	// FindProducts returns the products among productIDs that the establishment sells: not
	// deleted, in a category of the establishment that is not deleted either.
	FindProducts(ctx context.Context, establishmentID string, productIDs []string) ([]domain.OrderProduct, error)

	// Create opens the order and, if it has a table, marks the table OCCUPIED.
	Create(ctx context.Context, order domain.NewOrder) (domain.OrderRow, error)
	// AddItems adds lines to the order and sets its totalAmount (and notes, if they change).
	AddItems(ctx context.Context, orderID string, addition domain.OrderItemsAddition) (domain.OrderRow, error)
	// BulkUpdate locks the order (FOR UPDATE), fails with ORDER_NOT_OPEN if it is no longer
	// open, applies each update to its line (skipping lines of other orders) and sets what
	// the order has taken from the paid units.
	BulkUpdate(ctx context.Context, orderID string, updates []domain.OrderItemUpdate) (domain.OrderRow, error)
	// Checkout closes the order if it is still open (ORDER_NOT_OPEN otherwise), charges what
	// is pending by method and frees its table.
	Checkout(ctx context.Context, orderID string, tableID *string, method domain.PaymentMethod) (domain.OrderRow, error)
	// Cancel cancels the order and frees its table.
	Cancel(ctx context.Context, orderID string, tableID *string) (domain.OrderRow, error)
	// MoveTable frees the old table, occupies the new one and moves the order to it.
	MoveTable(ctx context.Context, orderID string, oldTableID *string, newTableID, newTableName string) (domain.OrderRow, error)
	// Merge moves the lines, discounts, payments and tips of the sources into the primary
	// order, cancels the sources and frees their tables.
	Merge(ctx context.Context, merge domain.OrderMerge) (domain.OrderRow, error)
	// RemoveItem deletes the line and sets the order's totalAmount again.
	RemoveItem(ctx context.Context, orderID, itemID string) (domain.OrderRow, error)
	// RemoveLastItemAndCancel deletes the order's only line, cancels it and frees its table.
	RemoveLastItemAndCancel(ctx context.Context, orderID, itemID string, tableID *string) (domain.OrderRow, error)
	Delete(ctx context.Context, orderID string) error
	UpdateNotes(ctx context.Context, orderID string, changes domain.OrderNotesChanges) (domain.OrderRow, error)
	UpdateItemNotes(ctx context.Context, orderID, itemID string, notes *string) (domain.OrderRow, error)
	UpdateTip(ctx context.Context, orderID string, tipAmount int) error
	AddAdjustment(ctx context.Context, orderID string, adjustment domain.NewOrderAdjustment) (domain.OrderRow, error)
	RemoveAdjustment(ctx context.Context, orderID, adjustmentID string) (domain.OrderRow, error)
}
