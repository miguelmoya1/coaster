package service

import (
	"context"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

var cafeteriaProducts = []string{
	"Café Solo", "Café Espresso", "Café Cortado", "Infusión / Té", "Café con Leche", "Colacao", "Capuccino", "Carajillo",
}

func TestCatalogueServiceImport(t *testing.T) {
	tests := []struct {
		name  string
		repo  *fakeCatalogueRepo
		keys  []string
		check func(t *testing.T, repo *fakeCatalogueRepo)
	}{
		{
			name: "creates the category and its products as words",
			repo: &fakeCatalogueRepo{language: "es"},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if len(repo.createdCategories) != 1 || repo.createdCategories[0].Name != "Cafetería" ||
					*repo.createdCategories[0].Icon != "coffee" || repo.createdCategories[0].TaxRate != 1000 {
					t.Errorf("categories = %+v", repo.createdCategories)
				}
				first := repo.createdProducts[0]
				if first.CategoryID != "cat-Cafetería" || first.Name != "Café Solo" || first.Price != 120 || *first.Icon != "coffee" || first.TaxRate != nil {
					t.Errorf("first product = %+v", first)
				}
			},
		},
		{
			name: "writes the establishment language",
			repo: &fakeCatalogueRepo{language: "en"},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if repo.createdCategories[0].Name != "Coffee Shop" || repo.createdProducts[0].Name != "Black Coffee" {
					t.Errorf("wrote %q and %q", repo.createdCategories[0].Name, repo.createdProducts[0].Name)
				}
			},
		},
		{
			name: "falls back to Spanish without settings",
			repo: &fakeCatalogueRepo{},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if repo.createdCategories[0].Name != "Cafetería" {
					t.Errorf("wrote %q", repo.createdCategories[0].Name)
				}
			},
		},
		{
			name: "does not create a category the establishment already has",
			repo: &fakeCatalogueRepo{language: "es", categories: []domain.CatalogueCategoryName{{ID: "cat-1", Name: "Cafetería"}}},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if len(repo.createdCategories) != 0 || len(repo.createdProducts) != 8 {
					t.Errorf("created %d categories and %d products", len(repo.createdCategories), len(repo.createdProducts))
				}
			},
		},
		{
			name: "skips a product already in that category",
			repo: &fakeCatalogueRepo{
				language:     "es",
				categories:   []domain.CatalogueCategoryName{{ID: "cat-1", Name: "Cafetería"}},
				productNames: []domain.CatalogueProductName{{CategoryID: "cat-1", Name: "Café Solo"}},
			},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				names := productNamesOf(repo.createdProducts)
				if slices.Contains(names, "Café Solo") || len(names) != 7 {
					t.Errorf("created %v", names)
				}
			},
		},
		{
			name: "writes nothing when everything is already there",
			repo: &fakeCatalogueRepo{
				language:     "es",
				categories:   []domain.CatalogueCategoryName{{ID: "cat-1", Name: "Cafetería"}},
				productNames: productsIn("cat-1", cafeteriaProducts),
			},
			keys: []string{"cafeteria"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if repo.createdCategories != nil || repo.createdProducts != nil {
					t.Errorf("created %+v and %+v", repo.createdCategories, repo.createdProducts)
				}
			},
		},
		{
			name: "takes no selection as the whole catalogue",
			repo: &fakeCatalogueRepo{language: "es"},
			check: func(t *testing.T, repo *fakeCatalogueRepo) {
				if len(repo.createdCategories) != 7 || len(repo.createdProducts) != 76 {
					t.Errorf("created %d categories and %d products", len(repo.createdCategories), len(repo.createdProducts))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			events := &catalogEvents{}

			if err := NewCatalogueService(tt.repo, events).Import(context.Background(), "est-1", tt.keys); err != nil {
				t.Fatal(err)
			}

			tt.check(t, tt.repo)

			want := domain.CatalogueImportedEvent{EstablishmentID: "est-1"}
			if len(events.events) != 1 || events.events[0] != want {
				t.Errorf("events = %+v", events.events)
			}
		})
	}
}

func TestCatalogueServiceImportRefusesAnUnknownSelection(t *testing.T) {
	repo := &fakeCatalogueRepo{language: "es"}
	events := &catalogEvents{}

	err := NewCatalogueService(repo, events).Import(context.Background(), "est-1", []string{"sushi"})

	if !isCatalogError(err, domain.KindBadRequest, domain.CodeRequired) {
		t.Fatalf("err = %v, want a 400 REQUIRED", err)
	}
	if repo.createdCategories != nil || len(events.events) != 0 {
		t.Error("an empty selection must write and publish nothing")
	}
}

func TestCatalogueServiceStarter(t *testing.T) {
	catalogue, err := NewCatalogueService(&fakeCatalogueRepo{language: "en"}, &catalogEvents{}).Starter(context.Background(), "est-1")
	if err != nil {
		t.Fatal(err)
	}
	if catalogue[0].Name != "Coffee Shop" {
		t.Errorf("first category = %q", catalogue[0].Name)
	}
}

func productNamesOf(products []domain.NewProduct) []string {
	var names []string
	for _, product := range products {
		names = append(names, product.Name)
	}
	return names
}

func productsIn(categoryID string, names []string) []domain.CatalogueProductName {
	var products []domain.CatalogueProductName
	for _, name := range names {
		products = append(products, domain.CatalogueProductName{CategoryID: categoryID, Name: name})
	}
	return products
}
