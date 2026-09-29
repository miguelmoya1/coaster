package ports

import (
	"context"

	"coaster-api/internal/core/domain"
)

type TableRepository interface {
	ListOf(ctx context.Context, establishmentID string) ([]domain.Table, error)

	FindByID(ctx context.Context, tableID string) (*domain.Table, error)
	Create(ctx context.Context, establishmentID, name string) (domain.Table, error)
	Rename(ctx context.Context, tableID, name string) (domain.Table, error)

	Delete(ctx context.Context, tableID string) error
}

type TableService interface {
	List(ctx context.Context, establishmentID string) ([]domain.Table, error)
	Create(ctx context.Context, establishmentID, name string) error
	Update(ctx context.Context, establishmentID, tableID string, name *string) error
	Delete(ctx context.Context, establishmentID, tableID string) error
}
