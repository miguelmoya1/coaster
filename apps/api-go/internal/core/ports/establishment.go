package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// EstablishmentRepository stores the establishments and their settings.
type EstablishmentRepository interface {
	// Create writes, in one transaction, the establishment, its OWNER, its subscription in
	// trial and its settings.
	Create(ctx context.Context, establishment domain.NewEstablishment) (domain.Establishment, error)
	// ListForMember lists the establishments where the user is an active member.
	ListForMember(ctx context.Context, userID string) ([]domain.Establishment, error)
	// FindByID returns nil, nil when there is no such establishment.
	FindByID(ctx context.Context, establishmentID string) (*domain.Establishment, error)
	// FindSettings returns nil, nil when the establishment has no settings row. The modules
	// come as they are stored.
	FindSettings(ctx context.Context, establishmentID string) (*domain.EstablishmentSettings, error)
	// SaveSettings creates or updates the settings row and marks it configured now.
	SaveSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error)
}
