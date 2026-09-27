package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// CategoryRepository stores the categories of the establishments.
type CategoryRepository interface {
	// ListOf lists the categories not deleted, by name.
	ListOf(ctx context.Context, establishmentID string) ([]domain.Category, error)
	Create(ctx context.Context, establishmentID string, category domain.NewCategory) (domain.Category, error)
	// Update returns nil, nil when the establishment has no such category.
	Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) (*domain.Category, error)
	// Delete marks the category deleted. It returns false when the establishment has no such category.
	Delete(ctx context.Context, establishmentID, categoryID string) (bool, error)
}
