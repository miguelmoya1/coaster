package service

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// In-memory fakes for the catalog services (categories, products, catalogue, menu, media).

// catalogEvents records every event published.
type catalogEvents struct {
	mu     sync.Mutex
	events []ports.Event
}

func (p *catalogEvents) Publish(_ context.Context, event ports.Event) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.events = append(p.events, event)
}

// fakeCategoryRepo keeps categories in a slice. Deleted ones stay with deleted = true.
type fakeCategoryRepo struct {
	categories []domain.Category
	deleted    map[string]bool
	err        error
}

func (r *fakeCategoryRepo) ListOf(_ context.Context, establishmentID string) ([]domain.Category, error) {
	list := []domain.Category{}
	for _, category := range r.categories {
		if category.EstablishmentID == establishmentID && !r.deleted[category.ID] {
			list = append(list, category)
		}
	}
	return list, r.err
}

func (r *fakeCategoryRepo) Create(_ context.Context, establishmentID string, category domain.NewCategory) (domain.Category, error) {
	if r.err != nil {
		return domain.Category{}, r.err
	}
	created := domain.Category{
		ID: "cat-new", EstablishmentID: establishmentID, Name: category.Name, Icon: category.Icon,
		TaxRate: catalogIntOr(category.TaxRate, domain.DefaultTaxRate),
	}
	r.categories = append(r.categories, created)
	return created, nil
}

func (r *fakeCategoryRepo) Update(_ context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) (*domain.Category, error) {
	for i, category := range r.categories {
		if category.ID == categoryID && category.EstablishmentID == establishmentID {
			r.categories[i].Name = changes.Name
			if changes.Icon != nil {
				r.categories[i].Icon = changes.Icon
			}
			if changes.ClearIcon {
				r.categories[i].Icon = nil
			}
			if changes.TaxRate != nil {
				r.categories[i].TaxRate = *changes.TaxRate
			}
			updated := r.categories[i]
			return &updated, nil
		}
	}
	return nil, r.err
}

func (r *fakeCategoryRepo) Delete(_ context.Context, establishmentID, categoryID string) (bool, error) {
	for _, category := range r.categories {
		if category.ID == categoryID && category.EstablishmentID == establishmentID {
			if r.deleted == nil {
				r.deleted = map[string]bool{}
			}
			r.deleted[categoryID] = true
			return true, nil
		}
	}
	return false, r.err
}

// fakeProductRepo keeps products by id and knows which establishment each category is in.
type fakeProductRepo struct {
	products           map[string]domain.ProductRow
	deleted            map[string]bool
	categoryOf         map[string]string // category id → establishment id
	updatedWith        domain.ProductChanges
	created            domain.NewProduct
	categoryTaxRateFor map[string]int
}

func newFakeProductRepo() *fakeProductRepo {
	return &fakeProductRepo{
		products:   map[string]domain.ProductRow{},
		deleted:    map[string]bool{},
		categoryOf: map[string]string{"cat-1": "est-1", "cat-other": "est-2"},
	}
}

func (r *fakeProductRepo) ListOf(_ context.Context, establishmentID string) ([]domain.ProductRow, error) {
	var rows []domain.ProductRow
	for _, row := range r.products {
		if r.categoryOf[row.CategoryID] == establishmentID && !r.deleted[row.ID] {
			if rate, ok := r.categoryTaxRateFor[row.CategoryID]; ok {
				row.CategoryTaxRate = &rate
			}
			rows = append(rows, row)
		}
	}
	return rows, nil
}

func (r *fakeProductRepo) CategoryBelongsTo(_ context.Context, categoryID, establishmentID string) (bool, error) {
	return r.categoryOf[categoryID] == establishmentID, nil
}

func (r *fakeProductRepo) ProductBelongsTo(_ context.Context, productID, establishmentID string) (bool, error) {
	row, ok := r.products[productID]
	return ok && !r.deleted[productID] && r.categoryOf[row.CategoryID] == establishmentID, nil
}

func (r *fakeProductRepo) Create(_ context.Context, product domain.NewProduct) (domain.ProductRow, error) {
	r.created = product
	row := domain.ProductRow{
		ID: "prod-new", CategoryID: product.CategoryID, Name: product.Name, Price: product.Price,
		CurrentStock: product.CurrentStock, MinStockAlert: product.MinStockAlert, ImageURL: product.ImageURL,
		Icon: product.Icon, TaxRate: product.TaxRate, Allergens: product.Allergens,
	}
	r.products[row.ID] = row
	return row, nil
}

func (r *fakeProductRepo) Update(_ context.Context, productID string, changes domain.ProductChanges) (domain.ProductRow, error) {
	r.updatedWith = changes
	row := r.products[productID]
	if changes.Name != nil {
		row.Name = *changes.Name
	}
	if changes.CurrentStock != nil {
		row.CurrentStock = *changes.CurrentStock
	}
	if changes.ClearOwnTaxRate {
		row.TaxRate = nil
	}
	r.products[productID] = row
	return row, nil
}

func (r *fakeProductRepo) AdjustStock(_ context.Context, productID string, delta int) (domain.ProductRow, error) {
	row := r.products[productID]
	row.CurrentStock += delta
	r.products[productID] = row
	return row, nil
}

func (r *fakeProductRepo) Delete(_ context.Context, productID string) error {
	r.deleted[productID] = true
	return nil
}

// fakeCatalogueRepo answers the import's queries from its fields and records the writes.
type fakeCatalogueRepo struct {
	language string
	// categories are the categories found by name; created ones are added to them.
	categories        []domain.CatalogueCategoryName
	productNames      []domain.CatalogueProductName
	createdCategories []domain.NewCatalogueCategory
	createdProducts   []domain.NewProduct
}

func (r *fakeCatalogueRepo) LanguageOf(context.Context, string) (string, error) {
	return r.language, nil
}

func (r *fakeCatalogueRepo) FindCategoriesByName(_ context.Context, _ string, names []string) ([]domain.CatalogueCategoryName, error) {
	var found []domain.CatalogueCategoryName
	for _, category := range r.categories {
		if slices.Contains(names, category.Name) {
			found = append(found, category)
		}
	}
	return found, nil
}

func (r *fakeCatalogueRepo) ProductNames(_ context.Context, categoryIDs []string) ([]domain.CatalogueProductName, error) {
	var names []domain.CatalogueProductName
	for _, product := range r.productNames {
		if slices.Contains(categoryIDs, product.CategoryID) {
			names = append(names, product)
		}
	}
	return names, nil
}

func (r *fakeCatalogueRepo) CreateCategories(_ context.Context, _ string, categories []domain.NewCatalogueCategory) error {
	r.createdCategories = append(r.createdCategories, categories...)
	for _, category := range categories {
		r.categories = append(r.categories, domain.CatalogueCategoryName{ID: "cat-" + category.Name, Name: category.Name})
	}
	return nil
}

func (r *fakeCatalogueRepo) CreateProducts(_ context.Context, products []domain.NewProduct) error {
	r.createdProducts = append(r.createdProducts, products...)
	return nil
}

// fakeMenuRepo keeps one menu per establishment.
type fakeMenuRepo struct {
	menus         map[string]*domain.Menu // by establishment id
	establishment *domain.MenuEstablishment
	takenSlugs    []string
	ownedProducts []string
	page          *domain.PublishedMenuPage
	soldOut       map[string]bool
	published     map[string]domain.PublishedMenu
	unpublished   bool
	savedName     string
	savedLangs    []string
}

func newFakeMenuRepo() *fakeMenuRepo {
	return &fakeMenuRepo{menus: map[string]*domain.Menu{}}
}

func (r *fakeMenuRepo) FindByEstablishment(_ context.Context, establishmentID string) (*domain.Menu, error) {
	return r.menus[establishmentID], nil
}

func (r *fakeMenuRepo) EstablishmentFor(context.Context, string) (*domain.MenuEstablishment, error) {
	return r.establishment, nil
}

func (r *fakeMenuRepo) TakenSlugs(context.Context, string) ([]string, error) {
	return r.takenSlugs, nil
}

func (r *fakeMenuRepo) Create(_ context.Context, establishmentID, slug, name, language string) (*domain.Menu, error) {
	menu := &domain.Menu{ID: "menu-1", EstablishmentID: establishmentID, Slug: slug, Name: name, DefaultLanguage: language, Languages: []string{language}}
	r.menus[establishmentID] = menu
	return menu, nil
}

func (r *fakeMenuRepo) ReplaceDraft(_ context.Context, menuID, name string, languages []string, sections []domain.MenuSectionDraft) (*domain.Menu, error) {
	r.savedName, r.savedLangs = name, languages
	for _, menu := range r.menus {
		if menu.ID != menuID {
			continue
		}
		menu.Name, menu.Languages, menu.Sections = name, languages, nil
		for _, section := range sections {
			saved := domain.MenuSection{Translations: section.Translations}
			for _, item := range section.Items {
				saved.Items = append(saved.Items, domain.MenuItem{
					ProductID: item.ProductID, Price: item.Price, IsVisible: item.IsVisible, Translations: item.Translations,
				})
			}
			menu.Sections = append(menu.Sections, saved)
		}
		return menu, nil
	}
	return nil, nil
}

func (r *fakeMenuRepo) Publish(_ context.Context, _ string, snapshot map[string]domain.PublishedMenu) error {
	r.published = snapshot
	return nil
}

func (r *fakeMenuRepo) Unpublish(context.Context, string) error {
	r.unpublished = true
	return nil
}

func (r *fakeMenuRepo) ProductsOf(_ context.Context, _ string, productIDs []string) ([]string, error) {
	var owned []string
	for _, id := range productIDs {
		if slices.Contains(r.ownedProducts, id) {
			owned = append(owned, id)
		}
	}
	return owned, nil
}

func (r *fakeMenuRepo) FindPublishedBySlug(context.Context, string) (*domain.PublishedMenuPage, error) {
	return r.page, nil
}

func (r *fakeMenuRepo) SoldOutAmong(context.Context, []string) (map[string]bool, error) {
	return r.soldOut, nil
}

// fakeFileStorage signs with a fixed URL and records what it signed.
type fakeFileStorage struct {
	paths       []string
	contentType string
	headers     map[string]string
	expires     time.Time
	err         error
}

func (s *fakeFileStorage) SignUploadURL(_ context.Context, objectPath, contentType string, headers map[string]string, expires time.Time) (string, error) {
	s.paths = append(s.paths, objectPath)
	s.contentType, s.headers, s.expires = contentType, headers, expires
	return "https://signed.example/upload", s.err
}

func (s *fakeFileStorage) PublicURL(objectPath string) string {
	return "https://storage.googleapis.com/imagenes-clientes-app/" + objectPath
}

// catalogRealtimeFake records what was sent to the streams.
type catalogRealtimeFake struct {
	sent []catalogRealtimeMessage
}

type catalogRealtimeMessage struct {
	establishmentID string
	event           string
	payload         any
}

func (r *catalogRealtimeFake) Publish(establishmentID string, event string, payload any) {
	r.sent = append(r.sent, catalogRealtimeMessage{establishmentID: establishmentID, event: event, payload: payload})
}

func (r *catalogRealtimeFake) Revoke(string, string) {}

func catalogIntOr(value *int, fallback int) int {
	if value == nil {
		return fallback
	}
	return *value
}

// isCatalogError reports whether err is a business error of that kind and code.
func isCatalogError(err error, kind domain.ErrorKind, code string) bool {
	var domainErr *domain.Error
	return errors.As(err, &domainErr) && domainErr.Kind == kind && domainErr.Code == code
}
