package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// MenuRepository stores the public menus.
type MenuRepository interface {
	// FindByEstablishment returns nil, nil when the establishment has no menu yet.
	FindByEstablishment(ctx context.Context, establishmentID string) (*domain.Menu, error)
	// EstablishmentFor returns nil, nil when there is no such establishment.
	EstablishmentFor(ctx context.Context, establishmentID string) (*domain.MenuEstablishment, error)
	// TakenSlugs lists the slugs that start with root.
	TakenSlugs(ctx context.Context, root string) ([]string, error)
	Create(ctx context.Context, establishmentID, slug, name, language string) (*domain.Menu, error)
	// ReplaceDraft swaps every section and line of the menu, and its name and languages,
	// in one transaction.
	ReplaceDraft(ctx context.Context, menuID, name string, languages []string, sections []domain.MenuSectionDraft) (*domain.Menu, error)
	Publish(ctx context.Context, menuID string, snapshot map[string]domain.PublishedMenu) error
	Unpublish(ctx context.Context, menuID string) error
	// ProductsOf returns which of productIDs are products of the establishment not deleted.
	ProductsOf(ctx context.Context, establishmentID string, productIDs []string) ([]string, error)
	// FindPublishedBySlug returns nil, nil when no menu has that slug.
	FindPublishedBySlug(ctx context.Context, slug string) (*domain.PublishedMenuPage, error)
	// SoldOutAmong returns which of productIDs have no stock left.
	SoldOutAmong(ctx context.Context, productIDs []string) (map[string]bool, error)
}
