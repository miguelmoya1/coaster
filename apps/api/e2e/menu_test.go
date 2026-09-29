package e2e

import (
	"net/http"
	"slices"
	"strings"
	"testing"
)

type menuDraft struct {
	ID                    string   `json:"id"`
	Slug                  string   `json:"slug"`
	Languages             []string `json:"languages"`
	HasUnpublishedChanges bool     `json:"hasUnpublishedChanges"`
	PublishedAt           *string  `json:"publishedAt"`
	Sections              []struct {
		Translations map[string]struct {
			Name string `json:"name"`
		} `json:"translations"`
		Items []struct {
			IsVisible bool `json:"isVisible"`
		} `json:"items"`
	} `json:"sections"`
}

type publishedMenu struct {
	Sections []struct {
		Name  string `json:"name"`
		Items []struct {
			Name      string   `json:"name"`
			Price     int      `json:"price"`
			Allergens []string `json:"allergens"`
			SoldOut   *bool    `json:"soldOut"`
		} `json:"items"`
	} `json:"sections"`
}

func TestMenu(t *testing.T) {
	type bar struct {
		id        string
		productID string
	}

	setup := func(t *testing.T) bar {
		resetDatabase(t)
		admin := mockUser
		admin.role = "ADMIN"
		createUser(t, admin)
		id := createEstablishment(t, "Bar Pepe")
		categoryID := createCategory(t, id, "Cafetería")
		mustExec(t, `UPDATE "Category" SET icon = 'coffee' WHERE id = $1`, categoryID)
		return bar{id: id, productID: createProduct(t, categoryID, product{name: "Café Solo", price: 120, allergens: []string{"MILK"}})}
	}

	type sectionOptions func(map[string]any)

	oneSection := func(b bar, options ...sectionOptions) map[string]any {
		body := map[string]any{
			"name":      "Carta",
			"languages": []string{"es", "en"},
			"sections": []map[string]any{{
				"translations": map[string]any{"es": map[string]any{"name": "Cafetería"}, "en": map[string]any{"name": "Coffee"}},
				"items": []map[string]any{{
					"productId": b.productID,
					"isVisible": true,
					"translations": map[string]any{
						"es": map[string]any{"name": "Café Solo", "description": "Recién molido"},
						"en": map[string]any{"name": "Black Coffee"},
					},
				}},
			}},
		}
		for _, apply := range options {
			apply(body)
		}
		return body
	}

	set := func(key string, value any) sectionOptions {
		return func(body map[string]any) { body[key] = value }
	}

	draft := func(t *testing.T, api *app, b bar) menuDraft {
		var menu menuDraft
		api.get(t, "/establishments/"+b.id+"/menu").expect(t, http.StatusOK).decode(t, &menu)
		return menu
	}

	save := func(t *testing.T, api *app, b bar, body map[string]any) *response {
		return api.put(t, "/establishments/"+b.id+"/menu", body)
	}

	publish := func(t *testing.T, api *app, b bar) {
		api.post(t, "/establishments/"+b.id+"/menu/publish", nil).expect(t, http.StatusCreated)
	}

	public := func(t *testing.T, api *app, slug, language string) *response {
		path := "/menus/" + slug
		if language != "" {
			path += "?lang=" + language
		}
		return api.get(t, path, anonymous())
	}

	published := func(t *testing.T, api *app, slug, language string) publishedMenu {
		var menu publishedMenu
		public(t, api, slug, language).expect(t, http.StatusOK).decode(t, &menu)
		return menu
	}

	saveAndPublish := func(t *testing.T, api *app, b bar) string {
		slug := draft(t, api, b).Slug
		save(t, api, b, oneSection(b)).expect(t, http.StatusOK)
		publish(t, api, b)
		return slug
	}

	t.Run("starts a draft on first read, slugged from the establishment", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)

		response := api.get(t, "/establishments/"+b.id+"/menu").expect(t, http.StatusOK)
		var menu menuDraft
		response.decode(t, &menu)

		if menu.Slug != "bar-pepe" || !strings.Contains(string(response.body), `"sections":[]`) ||
			!slices.Equal(menu.Languages, []string{"es"}) || !menu.HasUnpublishedChanges {
			t.Errorf("draft = %s, want bar-pepe, no sections, es and unpublished changes", response.body)
		}
	})

	t.Run("hands back the same menu on a second read", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)

		first := draft(t, api, b)
		second := draft(t, api, b)

		if second.ID != first.ID || queryValue[int](t, `SELECT count(*) FROM "Menu"`) != 1 {
			t.Errorf("menus %s and %s, want one", first.ID, second.ID)
		}
	})

	t.Run("replaces the draft whole, so a reorder is just a different array", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		draft(t, api, b)
		save(t, api, b, oneSection(b)).expect(t, http.StatusOK)

		var menu menuDraft
		save(t, api, b, oneSection(b, set("sections", []map[string]any{
			{"translations": map[string]any{"es": map[string]any{"name": "Postres"}}, "items": []any{}},
			{"translations": map[string]any{"es": map[string]any{"name": "Cafetería"}}, "items": []any{}},
		}))).expect(t, http.StatusOK).decode(t, &menu)

		var names []string
		for _, section := range menu.Sections {
			names = append(names, section.Translations["es"].Name)
		}
		if !slices.Equal(names, []string{"Postres", "Cafetería"}) {
			t.Errorf("sections = %v, want Postres then Cafetería", names)
		}
		sections := queryValue[int](t, `SELECT count(*) FROM "MenuSection"`)
		items := queryValue[int](t, `SELECT count(*) FROM "MenuItem"`)
		if sections != 2 || items != 0 {
			t.Errorf("%d sections and %d items stored, want 2 and 0", sections, items)
		}
	})

	t.Run("refuses a product of another establishment", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		draft(t, api, b)
		otherID := createEstablishment(t, "Otro")
		foreignID := createProduct(t, createCategory(t, otherID, "Suya"), product{name: "Ajena", price: 100})

		save(t, api, b, oneSection(b, set("sections", []map[string]any{{
			"translations": map[string]any{"es": map[string]any{"name": "X"}},
			"items":        []map[string]any{{"productId": foreignID, "translations": map[string]any{}}},
		}}))).expect(t, http.StatusNotFound)
	})

	t.Run("refuses dropping the language everything falls back to", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		draft(t, api, b)

		save(t, api, b, oneSection(b, set("languages", []string{"en"}))).expect(t, http.StatusBadRequest)
	})

	t.Run("stays a 404 until published", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := draft(t, api, b).Slug
		save(t, api, b, oneSection(b)).expect(t, http.StatusOK)

		public(t, api, slug, "").expect(t, http.StatusNotFound)
		publish(t, api, b)
		public(t, api, slug, "").expect(t, http.StatusOK)
	})

	t.Run("serves the language asked for and defaults to the establishment one", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := saveAndPublish(t, api, b)

		english := published(t, api, slug, "en")
		if english.Sections[0].Name != "Coffee" || english.Sections[0].Items[0].Name != "Black Coffee" {
			t.Errorf("english = %+v, want Coffee and Black Coffee", english)
		}
		if fallback := published(t, api, slug, "de"); fallback.Sections[0].Name != "Cafetería" {
			t.Errorf("fallback section = %s, want Cafetería", fallback.Sections[0].Name)
		}
	})

	t.Run("carries price and allergens, and never the stock", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := saveAndPublish(t, api, b)

		response := public(t, api, slug, "").expect(t, http.StatusOK)
		var menu publishedMenu
		response.decode(t, &menu)

		item := menu.Sections[0].Items[0]
		if item.Price != 120 || !slices.Equal(item.Allergens, []string{"MILK"}) || strings.Contains(string(response.body), "currentStock") {
			t.Errorf("published = %s, want 120, MILK and no stock", response.body)
		}
	})

	t.Run("stops reporting pending changes once published", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		saveAndPublish(t, api, b)

		if menu := draft(t, api, b); menu.HasUnpublishedChanges || menu.PublishedAt == nil {
			t.Errorf("draft = %+v, want it published with nothing pending", menu)
		}
	})

	t.Run("reports pending changes when a product on it moves", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		saveAndPublish(t, api, b)

		mustExec(t, `UPDATE "Product" SET allergens = '{GLUTEN}', "updatedAt" = CURRENT_TIMESTAMP + interval '1 second' WHERE id = $1`, b.productID)

		if !draft(t, api, b).HasUnpublishedChanges {
			t.Error("the moved product does not count as a pending change")
		}
	})

	t.Run("carries the allergens as they are at publish time", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := draft(t, api, b).Slug
		save(t, api, b, oneSection(b)).expect(t, http.StatusOK)
		mustExec(t, `UPDATE "Product" SET allergens = '{GLUTEN,NUTS}' WHERE id = $1`, b.productID)
		publish(t, api, b)

		if allergens := published(t, api, slug, "").Sections[0].Items[0].Allergens; !slices.Equal(allergens, []string{"GLUTEN", "NUTS"}) {
			t.Errorf("allergens = %v, want GLUTEN and NUTS", allergens)
		}
	})

	t.Run("reports pending changes again after the draft is touched", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		saveAndPublish(t, api, b)

		save(t, api, b, oneSection(b, set("name", "Otra carta"))).expect(t, http.StatusOK)

		if !draft(t, api, b).HasUnpublishedChanges {
			t.Error("the touched draft does not count as a pending change")
		}
	})

	t.Run("does not change what customers read until published again", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := saveAndPublish(t, api, b)

		save(t, api, b, oneSection(b, set("sections", []map[string]any{
			{"translations": map[string]any{"es": map[string]any{"name": "Cambiada"}}, "items": []any{}},
		}))).expect(t, http.StatusOK)

		if name := published(t, api, slug, "").Sections[0].Name; name != "Cafetería" {
			t.Errorf("customers read %s, want Cafetería", name)
		}
	})

	t.Run("hides the menu again when unpublished", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := saveAndPublish(t, api, b)

		api.post(t, "/establishments/"+b.id+"/menu/unpublish", nil).expect(t, http.StatusCreated)

		public(t, api, slug, "").expect(t, http.StatusNotFound)
	})

	t.Run("says nothing about stock while the establishment has not asked for it", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		slug := saveAndPublish(t, api, b)
		mustExec(t, `UPDATE "Product" SET "currentStock" = 0 WHERE id = $1`, b.productID)

		if soldOut := published(t, api, slug, "").Sections[0].Items[0].SoldOut; soldOut != nil {
			t.Errorf("soldOut = %v, want it absent", *soldOut)
		}
	})

	t.Run("answers stock as it is when read, not as it was when published", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		mustExec(t, `UPDATE "EstablishmentSettings" SET "markSoldOut" = true WHERE "establishmentId" = $1`, b.id)
		slug := draft(t, api, b).Slug
		save(t, api, b, oneSection(b)).expect(t, http.StatusOK)
		mustExec(t, `UPDATE "Product" SET "currentStock" = 10 WHERE id = $1`, b.productID)
		publish(t, api, b)

		if soldOut := published(t, api, slug, "").Sections[0].Items[0].SoldOut; soldOut == nil || *soldOut {
			t.Errorf("soldOut while stocked = %v, want false", soldOut)
		}

		mustExec(t, `UPDATE "Product" SET "currentStock" = 0 WHERE id = $1`, b.productID)

		if soldOut := published(t, api, slug, "").Sections[0].Items[0].SoldOut; soldOut == nil || !*soldOut {
			t.Errorf("soldOut after running out = %v, want true", soldOut)
		}
	})

	t.Run("keeps a hidden line in the draft and away from customers", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		draft(t, api, b)
		hidden := oneSection(b)
		hidden["sections"].([]map[string]any)[0]["items"].([]map[string]any)[0]["isVisible"] = false
		save(t, api, b, hidden).expect(t, http.StatusOK)
		publish(t, api, b)

		menu := draft(t, api, b)
		if menu.Sections[0].Items[0].IsVisible {
			t.Error("the draft lost the hidden line")
		}
		if sections := published(t, api, menu.Slug, "").Sections; len(sections) != 0 {
			t.Errorf("customers see %+v, want no sections", sections)
		}
	})

	t.Run("answers 404 for an unknown slug", func(t *testing.T) {
		api := newApp(t)
		setup(t)

		public(t, api, "no-existe", "").expect(t, http.StatusNotFound)
	})
}
