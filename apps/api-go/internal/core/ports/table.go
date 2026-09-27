package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// TableRepository stores the tables of the establishments.
type TableRepository interface {
	// ListOf lists the establishment's tables by name.
	ListOf(ctx context.Context, establishmentID string) ([]domain.Table, error)
	// FindByID returns nil when there is no such table.
	FindByID(ctx context.Context, tableID string) (*domain.Table, error)
	Create(ctx context.Context, establishmentID, name string) (domain.Table, error)
	Rename(ctx context.Context, tableID, name string) (domain.Table, error)
	// Delete removes the table; its orders keep the name they had and lose the link.
	Delete(ctx context.Context, tableID string) error
}
