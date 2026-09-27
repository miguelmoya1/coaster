package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// CatalogueService is the catalogue module: the starter catalogue a new establishment can import.
type CatalogueService struct {
	catalogue ports.CatalogueRepository
	events    ports.EventPublisher
}

func NewCatalogueService(catalogue ports.CatalogueRepository, events ports.EventPublisher) *CatalogueService {
	return &CatalogueService{catalogue: catalogue, events: events}
}

// Starter is GetStarterCatalogueQuery: the catalogue in the establishment's language.
func (s *CatalogueService) Starter(ctx context.Context, establishmentID string) ([]domain.StarterCatalogueCategory, error) {
	language, err := s.catalogue.LanguageOf(ctx, establishmentID)
	if err != nil {
		return nil, err
	}

	return domain.ResolveCatalogue(domain.AsLanguage(language)), nil
}

// Import is ImportStarterCatalogueCommand: it creates the chosen categories (all of them
// when keys is empty) with their products, in the establishment's language. Categories and
// products that already exist by name are left alone, so importing twice changes nothing.
func (s *CatalogueService) Import(ctx context.Context, establishmentID string, keys []string) error {
	language, err := s.catalogue.LanguageOf(ctx, establishmentID)
	if err != nil {
		return err
	}

	wanted := domain.ResolveCategories(keys, domain.AsLanguage(language))
	if len(wanted) == 0 {
		return domain.BadRequest(domain.CodeRequired)
	}

	names := make([]string, 0, len(wanted))
	for _, category := range wanted {
		names = append(names, category.Name)
	}

	existing, err := s.catalogue.FindCategoriesByName(ctx, establishmentID, names)
	if err != nil {
		return err
	}

	existingNames := make(map[string]bool, len(existing))
	for _, category := range existing {
		existingNames[category.Name] = true
	}

	var missing []domain.NewCatalogueCategory
	for _, category := range wanted {
		if !existingNames[category.Name] {
			missing = append(missing, domain.NewCatalogueCategory{Name: category.Name, Icon: category.Icon, TaxRate: category.TaxRate})
		}
	}

	if len(missing) > 0 {
		if err := s.catalogue.CreateCategories(ctx, establishmentID, missing); err != nil {
			return err
		}
	}

	all, err := s.catalogue.FindCategoriesByName(ctx, establishmentID, names)
	if err != nil {
		return err
	}

	// With two categories of the same name, the last one wins, like new Map(...) in Nest.
	idByName := make(map[string]string, len(all))
	for _, category := range all {
		idByName[category.Name] = category.ID
	}

	categoryIDs := make([]string, 0, len(idByName))
	for _, id := range idByName {
		categoryIDs = append(categoryIDs, id)
	}

	taken, err := s.catalogue.ProductNames(ctx, categoryIDs)
	if err != nil {
		return err
	}

	takenKeys := make(map[domain.CatalogueProductName]bool, len(taken))
	for _, product := range taken {
		takenKeys[product] = true
	}

	var products []domain.NewProduct
	for _, category := range wanted {
		categoryID, ok := idByName[category.Name]
		if !ok {
			continue
		}

		for _, product := range category.Products {
			if takenKeys[domain.CatalogueProductName{CategoryID: categoryID, Name: product.Name}] {
				continue
			}

			icon := product.Icon
			products = append(products, domain.NewProduct{
				CategoryID: categoryID,
				Name:       product.Name,
				Price:      product.Price,
				Icon:       &icon,
				Allergens:  []string{},
				TaxRate:    product.TaxRate,
			})
		}
	}

	if len(products) > 0 {
		if err := s.catalogue.CreateProducts(ctx, products); err != nil {
			return err
		}
	}

	s.events.Publish(ctx, domain.CatalogueImportedEvent{EstablishmentID: establishmentID})
	return nil
}
