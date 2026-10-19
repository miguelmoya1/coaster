package repository

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func seedCategoryTestDB(t *testing.T) {
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

func TestCategoryRepository(t *testing.T) {
	seedCategoryTestDB(t)
	ctx := context.Background()
	categories := NewCategoryRepository(testPool)

	icon := "coffee"
	created, err := categories.Create(ctx, "e1", domain.NewCategory{Name: "Coffee", Icon: &icon})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || created.EstablishmentID != "e1" || *created.Icon != "coffee" || created.TaxRate != domain.DefaultTaxRate {
		t.Errorf("created = %+v", created)
	}

	customRate := 400
	withRate, err := categories.Create(ctx, "e1", domain.NewCategory{Name: "Bread", TaxRate: &customRate})
	if err != nil || withRate.TaxRate != 400 {
		t.Fatalf("Create with TaxRate = %+v, %v", withRate, err)
	}
	if _, err := categories.Delete(ctx, "e1", withRate.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := categories.Create(ctx, "missing", domain.NewCategory{Name: "Fail"}); err == nil {
		t.Fatal("Create for a missing establishment must fail")
	}

	list, err := categories.ListOf(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].Name != "Coffee" || list[1].Name != "Drinks" {
		t.Errorf("list = %+v, want Coffee then Drinks", list)
	}

	rate := 400
	updated, err := categories.Update(ctx, "e1", created.ID, domain.CategoryChanges{Name: "Café", ClearIcon: true, TaxRate: &rate})
	if err != nil {
		t.Fatal(err)
	}
	if updated == nil || updated.Name != "Café" || updated.Icon != nil || updated.TaxRate != 400 {
		t.Errorf("updated = %+v", updated)
	}

	other, err := categories.Update(ctx, "e1", "c2", domain.CategoryChanges{Name: "Mine"})
	if err != nil || other != nil {
		t.Errorf("updating another establishment's category = %+v, %v", other, err)
	}

	found, err := categories.Delete(ctx, "e1", created.ID)
	if err != nil || !found {
		t.Fatalf("delete = %v, %v", found, err)
	}
	if found, _ := categories.Delete(ctx, "e1", "c2"); found {
		t.Error("deleted another establishment's category")
	}

	list, _ = categories.ListOf(ctx, "e1")
	if len(list) != 1 || list[0].ID != "c1" {
		t.Errorf("list after delete = %+v", list)
	}
}
