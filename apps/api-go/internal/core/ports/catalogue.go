package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type CatalogueRepository interface {
	LanguageOf(ctx context.Context, establishmentID string) (string, error)

	FindCategoriesByName(ctx context.Context, establishmentID string, names []string) ([]domain.CatalogueCategoryName, error)

	ProductNames(ctx context.Context, categoryIDs []string) ([]domain.CatalogueProductName, error)
	CreateCategories(ctx context.Context, establishmentID string, categories []domain.NewCatalogueCategory) error
	CreateProducts(ctx context.Context, products []domain.NewProduct) error
}
