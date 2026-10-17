package repository

import (
	"context"
	"reflect"
	"testing"

	"coaster-api/internal/core/domain"
)

func seedCatalogueTestDB(t *testing.T) {
	t.Helper()
	resetDB(t)

	for _, statement := range []string{
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar Pepe', now()), ('e2', 'Otro', now())`,
		`INSERT INTO "EstablishmentSettings" (id, "establishmentId", language, "markSoldOut", "updatedAt") VALUES ('s1', 'e1', 'en', true, now())`,
		`INSERT INTO "Category" (id, "establishmentId", name, "taxRate") VALUES ('c1', 'e1', 'Drinks', 2100), ('c2', 'e2', 'Theirs', 1000)`,
	} {
		if _, err := testPool.Exec(context.Background(), statement); err != nil {
			t.Fatalf("seeding: %v", err)
		}
	}
}

func TestCatalogueRepository(t *testing.T) {
	seedCatalogueTestDB(t)
	ctx := context.Background()
	catalogue := NewCatalogueRepository(testPool)

	if language, err := catalogue.LanguageOf(ctx, "e1"); err != nil || language != "en" {
		t.Errorf("language of e1 = %q, %v", language, err)
	}
	if language, err := catalogue.LanguageOf(ctx, "e2"); err != nil || language != "" {
		t.Errorf("language of e2 = %q, %v", language, err)
	}

	icon := "coffee"
	err := catalogue.CreateCategories(ctx, "e1", []domain.NewCatalogueCategory{{Name: "Coffee Shop", Icon: &icon, TaxRate: 1000}})
	if err != nil {
		t.Fatal(err)
	}
	if err := catalogue.CreateCategories(ctx, "missing", []domain.NewCatalogueCategory{{Name: "Fail", TaxRate: 1000}}); err == nil {
		t.Fatal("CreateCategories for a missing establishment must fail")
	}

	found, err := catalogue.FindCategoriesByName(ctx, "e1", []string{"Coffee Shop", "Theirs"})
	if err != nil || len(found) != 1 || found[0].Name != "Coffee Shop" {
		t.Fatalf("found = %+v, %v", found, err)
	}

	err = catalogue.CreateProducts(ctx, []domain.NewProduct{
		{CategoryID: found[0].ID, Name: "Black Coffee", Price: 120, Icon: &icon},
		{CategoryID: "c1", Name: "Beer", Price: 250, Icon: &icon},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := catalogue.CreateProducts(ctx, []domain.NewProduct{{CategoryID: "missing", Name: "Fail", Price: 100}}); err == nil {
		t.Fatal("CreateProducts for a missing category must fail")
	}

	names, err := catalogue.ProductNames(ctx, []string{found[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(names, []domain.CatalogueProductName{{CategoryID: found[0].ID, Name: "Black Coffee"}}) {
		t.Errorf("names = %+v", names)
	}
}
