package service

import (
	"context"
	"maps"
	"slices"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type CatalogueService struct {
	catalogue ports.CatalogueRepository
	events    ports.EventPublisher
}

func NewCatalogueService(catalogue ports.CatalogueRepository, events ports.EventPublisher) *CatalogueService {
	return &CatalogueService{catalogue: catalogue, events: events}
}

func (s *CatalogueService) Starter(ctx context.Context, establishmentID string) ([]domain.StarterCatalogueCategory, error) {
	language, err := s.catalogue.LanguageOf(ctx, establishmentID)
	if err != nil {
		return nil, err
	}

	return domain.ResolveCatalogue(domain.AsLanguage(language)), nil
}

func (s *CatalogueService) Import(ctx context.Context, establishmentID string, keys []string) error {
	language, err := s.catalogue.LanguageOf(ctx, establishmentID)
	if err != nil {
		return err
	}

	wanted := domain.ResolveCategories(keys, domain.AsLanguage(language))
	if len(wanted) == 0 {
		return domain.BadRequest(domain.CodeRequired)
	}

	categoryIDs, err := s.ensureCategories(ctx, establishmentID, wanted)
	if err != nil {
		return err
	}

	products, err := s.missingProducts(ctx, wanted, categoryIDs)
	if err != nil {
		return err
	}
	if len(products) > 0 {
		if err := s.catalogue.CreateProducts(ctx, products); err != nil {
			return err
		}
	}

	s.events.Publish(ctx, domain.CatalogueImportedEvent{EstablishmentID: establishmentID})
	return nil
}

func (s *CatalogueService) ensureCategories(ctx context.Context, establishmentID string, wanted []domain.StarterCatalogueCategory) (map[string]string, error) {
	names := make([]string, 0, len(wanted))
	for _, category := range wanted {
		names = append(names, category.Name)
	}

	existing, err := s.catalogue.FindCategoriesByName(ctx, establishmentID, names)
	if err != nil {
		return nil, err
	}

	var missing []domain.NewCatalogueCategory
	for _, category := range wanted {
		exists := slices.ContainsFunc(existing, func(found domain.CatalogueCategoryName) bool { return found.Name == category.Name })
		if !exists {
			missing = append(missing, domain.NewCatalogueCategory{Name: category.Name, Icon: category.Icon, TaxRate: category.TaxRate})
		}
	}
	if len(missing) > 0 {
		if err := s.catalogue.CreateCategories(ctx, establishmentID, missing); err != nil {
			return nil, err
		}
	}

	all, err := s.catalogue.FindCategoriesByName(ctx, establishmentID, names)
	if err != nil {
		return nil, err
	}

	idByName := make(map[string]string, len(all))
	for _, category := range all {
		idByName[category.Name] = category.ID
	}
	return idByName, nil
}

func (s *CatalogueService) missingProducts(ctx context.Context, wanted []domain.StarterCatalogueCategory, categoryIDs map[string]string) ([]domain.NewProduct, error) {
	taken, err := s.catalogue.ProductNames(ctx, slices.Collect(maps.Values(categoryIDs)))
	if err != nil {
		return nil, err
	}

	var products []domain.NewProduct
	for _, category := range wanted {
		categoryID, ok := categoryIDs[category.Name]
		if !ok {
			continue
		}

		for _, product := range category.Products {
			if slices.Contains(taken, domain.CatalogueProductName{CategoryID: categoryID, Name: product.Name}) {
				continue
			}
			products = append(products, domain.NewProduct{
				CategoryID: categoryID,
				Name:       product.Name,
				Price:      product.Price,
				Icon:       new(product.Icon),
				Allergens:  []string{},
				TaxRate:    product.TaxRate,
			})
		}
	}
	return products, nil
}
