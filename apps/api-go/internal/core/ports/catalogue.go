package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// CatalogueRepository is what importing the starter catalogue needs.
type CatalogueRepository interface {
	// LanguageOf is the language of the establishment's settings, or "" without settings.
	LanguageOf(ctx context.Context, establishmentID string) (string, error)
	// FindCategoriesByName finds the categories not deleted with those names.
	FindCategoriesByName(ctx context.Context, establishmentID string, names []string) ([]domain.CatalogueCategoryName, error)
	// ProductNames lists the products not deleted of those categories.
	ProductNames(ctx context.Context, categoryIDs []string) ([]domain.CatalogueProductName, error)
	CreateCategories(ctx context.Context, establishmentID string, categories []domain.NewCatalogueCategory) error
	CreateProducts(ctx context.Context, products []domain.NewProduct) error
}
