package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type ProductRepository interface {
	ListOf(ctx context.Context, establishmentID string) ([]domain.ProductRow, error)

	CategoryBelongsTo(ctx context.Context, categoryID, establishmentID string) (bool, error)

	ProductBelongsTo(ctx context.Context, productID, establishmentID string) (bool, error)
	Create(ctx context.Context, product domain.NewProduct) (domain.ProductRow, error)
	Update(ctx context.Context, productID string, changes domain.ProductChanges) (domain.ProductRow, error)

	AdjustStock(ctx context.Context, productID string, delta int) (domain.ProductRow, error)
	Delete(ctx context.Context, productID string) error
}

type ProductService interface {
	List(ctx context.Context, establishmentID string) ([]domain.Product, error)
	Create(ctx context.Context, establishmentID string, input domain.CreateProductInput) error
	Update(ctx context.Context, establishmentID, productID string, changes domain.ProductChanges) error
	SetStock(ctx context.Context, establishmentID, productID string, stock int) error
	Delete(ctx context.Context, establishmentID, productID string) error
}
