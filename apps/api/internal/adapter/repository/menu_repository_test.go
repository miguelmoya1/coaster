package repository

import (
	"context"
	"reflect"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

func seedMenuTestDB(t *testing.T) {
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

func TestMenuRepository(t *testing.T) {
	seedMenuTestDB(t)
	ctx := context.Background()
	menus := NewMenuRepository(testPool)
	products := NewProductRepository(testPool)

	coffee, err := products.Create(ctx, domain.NewProduct{CategoryID: "c1", Name: "Café", Price: 120, Allergens: []string{"MILK"}})
	if err != nil {
		t.Fatal(err)
	}
	theirs, err := products.Create(ctx, domain.NewProduct{CategoryID: "c2", Name: "Ajena", Price: 100})
	if err != nil {
		t.Fatal(err)
	}

	if menu, err := menus.FindByEstablishment(ctx, "e1"); err != nil || menu != nil {
		t.Fatalf("menu before creating = %+v, %v", menu, err)
	}

	establishment, err := menus.EstablishmentFor(ctx, "e1")
	if err != nil || establishment.Name != "Bar Pepe" || *establishment.Language != "en" {
		t.Fatalf("establishment = %+v, %v", establishment, err)
	}
	if establishment, _ := menus.EstablishmentFor(ctx, "e2"); establishment.Language != nil {
		t.Errorf("e2 has no settings, got language %v", *establishment.Language)
	}
	if establishment, _ := menus.EstablishmentFor(ctx, "nope"); establishment != nil {
		t.Errorf("unknown establishment = %+v", establishment)
	}

	created, err := menus.Create(ctx, "e1", "bar-pepe", "Bar Pepe", "en")
	if err != nil {
		t.Fatal(err)
	}
	if created.Slug != "bar-pepe" || !reflect.DeepEqual(created.Languages, []string{"en"}) || created.PublishedAt != nil || len(created.Sections) != 0 {
		t.Errorf("created = %+v", created)
	}
	if _, err := menus.Create(ctx, "missing", "another-slug", "Bar Pepe", "en"); err == nil {
		t.Fatal("creating a menu for a missing establishment must fail")
	}
	if _, err := menus.Create(ctx, "e2", "bar-pepe-2", "Otro", "es"); err != nil {
		t.Fatal(err)
	}

	taken, err := menus.TakenSlugs(ctx, "bar-pepe")
	slices.Sort(taken)
	if err != nil || !reflect.DeepEqual(taken, []string{"bar-pepe", "bar-pepe-2"}) {
		t.Errorf("taken = %v, %v", taken, err)
	}

	price := 150
	saved, err := menus.ReplaceDraft(ctx, created.ID, "Carta", []string{"en", "es"}, []domain.MenuSectionDraft{
		{Translations: domain.MenuTranslations{"en": {Name: "Coffee"}}, Items: []domain.MenuItemDraft{
			{ProductID: &coffee.ID, IsVisible: true, Translations: domain.MenuTranslations{"en": {Name: "Black", Description: "Fresh"}}},
			{Price: &price, IsVisible: false, Translations: domain.MenuTranslations{}},
		}},
		{Translations: domain.MenuTranslations{"es": {Name: "Postres"}}},
	})
	if err != nil {
		t.Fatal(err)
	}

	if saved.Name != "Carta" || len(saved.Sections) != 2 || len(saved.Sections[0].Items) != 2 || len(saved.Sections[1].Items) != 0 {
		t.Fatalf("saved = %+v", saved)
	}
	first := saved.Sections[0].Items[0]
	if first.Product == nil || first.Product.Name != "Café" || !reflect.DeepEqual(first.Product.Allergens, []string{"MILK"}) ||
		first.Translations["en"] != (domain.MenuWording{Name: "Black", Description: "Fresh"}) {
		t.Errorf("first line = %+v (product %+v)", first, first.Product)
	}
	second := saved.Sections[0].Items[1]
	if second.Product != nil || *second.Price != 150 || second.IsVisible {
		t.Errorf("second line = %+v", second)
	}

	saved, err = menus.ReplaceDraft(ctx, created.ID, "Carta", []string{"en"}, []domain.MenuSectionDraft{
		{Translations: domain.MenuTranslations{"en": {Name: "Only"}}, Items: []domain.MenuItemDraft{
			{Price: &price, IsVisible: true, Translations: domain.MenuTranslations{"en": {Name: "Custom"}}},
		}},
	})
	if err != nil || len(saved.Sections) != 1 || len(saved.Sections[0].Items) != 1 {
		t.Fatalf("saved with custom item only = %+v, %v", saved, err)
	}

	saved, err = menus.ReplaceDraft(ctx, created.ID, "Carta", []string{"en"}, []domain.MenuSectionDraft{
		{Translations: domain.MenuTranslations{"en": {Name: "Only"}}},
	})
	if err != nil || len(saved.Sections) != 1 {
		t.Fatalf("saved again = %+v, %v", saved, err)
	}
	if _, err := menus.ReplaceDraft(ctx, "missing", "Carta", []string{"en"}, nil); err == nil {
		t.Fatal("ReplaceDraft on a missing menu must fail")
	}
	missingProduct := "missing"
	if _, err := menus.ReplaceDraft(ctx, created.ID, "Carta", []string{"en"}, []domain.MenuSectionDraft{
		{Translations: domain.MenuTranslations{"en": {Name: "Broken"}}, Items: []domain.MenuItemDraft{{ProductID: &missingProduct}}},
	}); err == nil {
		t.Fatal("ReplaceDraft with a missing product must fail")
	}
	var sectionCount, itemCount int
	_ = testPool.QueryRow(ctx, `SELECT count(*) FROM "MenuSection"`).Scan(&sectionCount)
	_ = testPool.QueryRow(ctx, `SELECT count(*) FROM "MenuItem"`).Scan(&itemCount)
	if sectionCount != 1 || itemCount != 0 {
		t.Errorf("rows left: %d sections, %d items", sectionCount, itemCount)
	}

	owned, err := menus.ProductsOf(ctx, "e1", []string{coffee.ID, theirs.ID})
	if err != nil || !reflect.DeepEqual(owned, []string{coffee.ID}) {
		t.Errorf("owned = %v, %v", owned, err)
	}

	if page, err := menus.FindPublishedBySlug(ctx, "bar-pepe"); err != nil || page.Snapshot != nil || page.DefaultLanguage != "en" || !page.MarkSoldOut {
		t.Fatalf("unpublished page = %+v, %v", page, err)
	}
	if page, err := menus.FindPublishedBySlug(ctx, "no-existe"); err != nil || page != nil {
		t.Fatalf("unknown slug = %+v, %v", page, err)
	}

	snapshot := map[string]domain.PublishedMenu{"en": {Name: "Carta", Language: "en", Languages: []string{"en"}, Sections: []domain.PublishedMenuSection{
		{Name: "Coffee", Items: []domain.PublishedMenuItem{{Name: "Black", Price: 120, Allergens: []string{}, ProductID: &coffee.ID}}},
	}}}
	if err := menus.Publish(ctx, created.ID, snapshot); err != nil {
		t.Fatal(err)
	}

	page, err := menus.FindPublishedBySlug(ctx, "bar-pepe")
	if err != nil || !reflect.DeepEqual(page.Snapshot, snapshot) {
		t.Fatalf("published page = %+v, %v", page, err)
	}

	published, _ := menus.FindByEstablishment(ctx, "e1")
	if published.PublishedAt == nil || !published.PublishedAt.Equal(published.UpdatedAt.Time) || published.HasUnpublishedChanges() {
		t.Errorf("after publishing: publishedAt %v, updatedAt %v", published.PublishedAt, published.UpdatedAt)
	}

	if _, err := testPool.Exec(ctx, `UPDATE "Product" SET "currentStock" = 0 WHERE id = $1`, coffee.ID); err != nil {
		t.Fatal(err)
	}
	soldOut, err := menus.SoldOutAmong(ctx, []string{coffee.ID, theirs.ID})
	if err != nil || !reflect.DeepEqual(soldOut, map[string]bool{coffee.ID: true, theirs.ID: true}) {
		t.Errorf("sold out = %v, %v", soldOut, err)
	}

	if _, err := testPool.Exec(ctx, `UPDATE "Menu" SET "publishedSnapshot" = '123'::jsonb WHERE id = $1`, created.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := menus.FindPublishedBySlug(ctx, "bar-pepe"); err == nil {
		t.Fatal("corrupted publishedSnapshot must fail to unmarshal")
	}

	if err := menus.Unpublish(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if page, _ := menus.FindPublishedBySlug(ctx, "bar-pepe"); page.Snapshot != nil {
		t.Error("the snapshot survived unpublishing")
	}
}
