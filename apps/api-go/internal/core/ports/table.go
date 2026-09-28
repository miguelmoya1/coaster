package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type TableRepository interface {
	ListOf(ctx context.Context, establishmentID string) ([]domain.Table, error)

	FindByID(ctx context.Context, tableID string) (*domain.Table, error)
	Create(ctx context.Context, establishmentID, name string) (domain.Table, error)
	Rename(ctx context.Context, tableID, name string) (domain.Table, error)

	Delete(ctx context.Context, tableID string) error
}
