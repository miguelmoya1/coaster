package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// ProductRepository stores the products. The rows it returns after a write come without
// their category's tax rate, as in Nest.
type ProductRepository interface {
	// ListOf lists the products not deleted of categories not deleted, by name, with
	// their category's tax rate.
	ListOf(ctx context.Context, establishmentID string) ([]domain.ProductRow, error)
	// CategoryBelongsTo reports whether the category, deleted or not, is the establishment's.
	CategoryBelongsTo(ctx context.Context, categoryID, establishmentID string) (bool, error)
	// ProductBelongsTo reports whether the product exists, is not deleted and is the establishment's.
	ProductBelongsTo(ctx context.Context, productID, establishmentID string) (bool, error)
	Create(ctx context.Context, product domain.NewProduct) (domain.ProductRow, error)
	Update(ctx context.Context, productID string, changes domain.ProductChanges) (domain.ProductRow, error)
	// AdjustStock adds delta, which may be negative, to the stock.
	AdjustStock(ctx context.Context, productID string, delta int) (domain.ProductRow, error)
	Delete(ctx context.Context, productID string) error
}
