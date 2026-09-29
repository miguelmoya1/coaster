package ports

import (
	"context"

	"coaster-api/internal/core/domain"
)

type CategoryRepository interface {
	ListOf(ctx context.Context, establishmentID string) ([]domain.Category, error)
	Create(ctx context.Context, establishmentID string, category domain.NewCategory) (domain.Category, error)

	Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) (*domain.Category, error)

	Delete(ctx context.Context, establishmentID, categoryID string) (bool, error)
}

type CategoryService interface {
	List(ctx context.Context, establishmentID string) ([]domain.Category, error)
	Create(ctx context.Context, establishmentID string, category domain.NewCategory) error
	Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) error
	Delete(ctx context.Context, establishmentID, categoryID string) error
}
