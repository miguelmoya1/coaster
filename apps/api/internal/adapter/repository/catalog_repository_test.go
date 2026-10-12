package repository

import (
	"context"
	"reflect"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func seedCatalog(t *testing.T) {
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
	seedCatalog(t)
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

func TestProductRepository(t *testing.T) {
	seedCatalog(t)
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

func TestCatalogueRepository(t *testing.T) {
	seedCatalog(t)
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

	names, err := catalogue.ProductNames(ctx, []string{found[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(names, []domain.CatalogueProductName{{CategoryID: found[0].ID, Name: "Black Coffee"}}) {
		t.Errorf("names = %+v", names)
	}
}

func TestMenuRepository(t *testing.T) {
	seedCatalog(t)
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
		{Translations: domain.MenuTranslations{"en": {Name: "Only"}}},
	})
	if err != nil || len(saved.Sections) != 1 {
		t.Fatalf("saved again = %+v, %v", saved, err)
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

	if err := menus.Unpublish(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if page, _ := menus.FindPublishedBySlug(ctx, "bar-pepe"); page.Snapshot != nil {
		t.Error("the snapshot survived unpublishing")
	}
}
