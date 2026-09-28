package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type MenuRepository interface {
	FindByEstablishment(ctx context.Context, establishmentID string) (*domain.Menu, error)

	EstablishmentFor(ctx context.Context, establishmentID string) (*domain.MenuEstablishment, error)

	TakenSlugs(ctx context.Context, root string) ([]string, error)
	Create(ctx context.Context, establishmentID, slug, name, language string) (*domain.Menu, error)

	ReplaceDraft(ctx context.Context, menuID, name string, languages []string, sections []domain.MenuSectionDraft) (*domain.Menu, error)
	Publish(ctx context.Context, menuID string, snapshot map[string]domain.PublishedMenu) error
	Unpublish(ctx context.Context, menuID string) error

	ProductsOf(ctx context.Context, establishmentID string, productIDs []string) ([]string, error)

	FindPublishedBySlug(ctx context.Context, slug string) (*domain.PublishedMenuPage, error)

	SoldOutAmong(ctx context.Context, productIDs []string) (map[string]bool, error)
}
