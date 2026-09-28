package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type EstablishmentRepository interface {
	Create(ctx context.Context, establishment domain.NewEstablishment) (domain.Establishment, error)

	ListForMember(ctx context.Context, userID string) ([]domain.Establishment, error)

	FindByID(ctx context.Context, establishmentID string) (*domain.Establishment, error)

	FindSettings(ctx context.Context, establishmentID string) (*domain.EstablishmentSettings, error)

	SaveSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error)
}

type EstablishmentService interface {
	Create(ctx context.Context, owner domain.User, name string) error
	ListFor(ctx context.Context, userID string) ([]domain.Establishment, error)
	Get(ctx context.Context, establishmentID string) (*domain.Establishment, error)
	Settings(ctx context.Context, establishmentID string) (domain.EstablishmentSettings, error)
	UpdateSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error)
}
