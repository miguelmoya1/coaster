package repository

import (
	"context"
	"reflect"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func seedProductTestDB(t *testing.T) {
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

func TestProductRepository(t *testing.T) {
	seedProductTestDB(t)
	ctx := context.Background()
	products := NewProductRepository(testPool)

	image := "https://example.test/beer.jpg"
	ownRate := 1000
	created, err := products.Create(ctx, domain.NewProduct{
		CategoryID: "c1", Name: "Beer", Price: 250, CurrentStock: 10, MinStockAlert: 2,
		ImageURL: &image, Allergens: []string{"GLUTEN"}, TaxRate: &ownRate,
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Name != "Beer" || created.Price != 250 || *created.TaxRate != 1000 || !reflect.DeepEqual(created.Allergens, []string{"GLUTEN"}) {
		t.Errorf("created = %+v", created)
	}
	if created.CategoryTaxRate != nil || created.UpdatedAt.IsZero() {
		t.Errorf("created comes without the category rate and with its update time: %+v", created)
	}

	water, err := products.Create(ctx, domain.NewProduct{CategoryID: "c1", Name: "Agua"})
	if err != nil {
		t.Fatal(err)
	}
	if water.Allergens == nil || len(water.Allergens) != 0 {
		t.Errorf("allergens = %#v, want empty", water.Allergens)
	}

	list, err := products.ListOf(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].Name != "Agua" || *list[0].CategoryTaxRate != 2100 {
		t.Errorf("list = %+v", list)
	}

	checks := []struct {
		name string
		got  func() (bool, error)
		want bool
	}{
		{"own category", func() (bool, error) { return products.CategoryBelongsTo(ctx, "c1", "e1") }, true},
		{"someone else's category", func() (bool, error) { return products.CategoryBelongsTo(ctx, "c2", "e1") }, false},
		{"own product", func() (bool, error) { return products.ProductBelongsTo(ctx, created.ID, "e1") }, true},
		{"someone else's product", func() (bool, error) { return products.ProductBelongsTo(ctx, created.ID, "e2") }, false},
	}
	for _, check := range checks {
		if got, err := check.got(); err != nil || got != check.want {
			t.Errorf("%s = %v, %v", check.name, got, err)
		}
	}

	time.Sleep(5 * time.Millisecond)
	name := "Lager"
	updated, err := products.Update(ctx, created.ID, domain.ProductChanges{
		Name: &name, ClearImageURL: true, Allergens: []string{}, ClearOwnTaxRate: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "Lager" || updated.ImageURL != nil || len(updated.Allergens) != 0 || updated.TaxRate != nil || updated.Price != 250 {
		t.Errorf("updated = %+v", updated)
	}
	if !updated.UpdatedAt.After(created.UpdatedAt.Time) {
		t.Errorf("updatedAt did not move: %v → %v", created.UpdatedAt, updated.UpdatedAt)
	}

	adjusted, err := products.AdjustStock(ctx, created.ID, -3)
	if err != nil || adjusted.CurrentStock != 7 {
		t.Fatalf("adjusted = %+v, %v", adjusted, err)
	}

	if err := products.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if belongs, _ := products.ProductBelongsTo(ctx, created.ID, "e1"); belongs {
		t.Error("a deleted product still belongs")
	}
	if list, _ := products.ListOf(ctx, "e1"); len(list) != 1 {
		t.Errorf("list after delete = %+v", list)
	}
}
