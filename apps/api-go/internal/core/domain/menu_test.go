package domain

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
	"time"
)

func menuPtr[T any](value T) *T { return &value }

// testMenu is the menu of render-menu.spec.ts: one section with a coffee.
func testMenu() Menu {
	return Menu{
		Name:            "Carta",
		DefaultLanguage: "es",
		Languages:       []string{"es", "en"},
		Sections: []MenuSection{{
			Translations: MenuTranslations{"es": {Name: "Cafetería"}, "en": {Name: "Coffee"}},
			Items: []MenuItem{{
				ProductID: menuPtr("prod-1"),
				IsVisible: true,
				Translations: MenuTranslations{
					"es": {Name: "Café Solo", Description: "Recién molido"},
					"en": {Name: "Black Coffee"},
				},
				Product: &MenuProduct{Name: "Café Solo", Price: 120, Allergens: []string{}},
			}},
		}},
	}
}

func TestMenuRender(t *testing.T) {
	tests := []struct {
		name     string
		change   func(m *Menu)
		language string
		check    func(t *testing.T, rendered PublishedMenu)
	}{
		{
			name:     "the language asked for",
			language: "en",
			check: func(t *testing.T, rendered PublishedMenu) {
				if rendered.Sections[0].Name != "Coffee" || rendered.Sections[0].Items[0].Name != "Black Coffee" {
					t.Errorf("rendered %+v", rendered.Sections)
				}
			},
		},
		{
			name: "falls back to the menu language",
			change: func(m *Menu) {
				m.Sections = []MenuSection{{
					Translations: MenuTranslations{"es": {Name: "Postres"}},
					Items:        []MenuItem{{Price: menuPtr(400), IsVisible: true, Translations: MenuTranslations{"es": {Name: "Flan"}}}},
				}}
			},
			language: "en",
			check: func(t *testing.T, rendered PublishedMenu) {
				if rendered.Sections[0].Name != "Postres" || rendered.Sections[0].Items[0].Name != "Flan" {
					t.Errorf("rendered %+v", rendered.Sections)
				}
			},
		},
		{
			name:     "the line's price over the product's",
			change:   func(m *Menu) { m.Sections[0].Items[0].Price = menuPtr(180) },
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if rendered.Sections[0].Items[0].Price != 180 {
					t.Errorf("price = %d", rendered.Sections[0].Items[0].Price)
				}
			},
		},
		{
			name:     "the product's price otherwise",
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if rendered.Sections[0].Items[0].Price != 120 {
					t.Errorf("price = %d", rendered.Sections[0].Items[0].Price)
				}
			},
		},
		{
			name: "a line whose product was deleted keeps its wording and price",
			change: func(m *Menu) {
				m.Sections[0].Items[0].Product.DeletedAt = menuPtr(NewTime(time.Now()))
				m.Sections[0].Items[0].Price = menuPtr(150)
			},
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				item := rendered.Sections[0].Items[0]
				if item.Name != "Café Solo" || item.Price != 150 {
					t.Errorf("item = %+v", item)
				}
			},
		},
		{
			name: "a line with nothing to call it is dropped",
			change: func(m *Menu) {
				m.Sections[0].Items[0].Product = nil
				m.Sections[0].Items[0].Translations = MenuTranslations{}
			},
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if len(rendered.Sections) != 0 {
					t.Errorf("sections = %+v", rendered.Sections)
				}
			},
		},
		{
			name:     "a section with no lines is dropped",
			change:   func(m *Menu) { m.Sections = []MenuSection{{Translations: MenuTranslations{"es": {Name: "Vacía"}}}} },
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if len(rendered.Sections) != 0 {
					t.Errorf("sections = %+v", rendered.Sections)
				}
			},
		},
		{
			name: "allergens and image come from the product",
			change: func(m *Menu) {
				m.Sections[0].Items[0].Product = &MenuProduct{
					Name: "Croquetas", Price: 600, ImageURL: menuPtr("https://example.test/c.jpg"), Allergens: []string{"GLUTEN", "MILK"},
				}
			},
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				item := rendered.Sections[0].Items[0]
				if !reflect.DeepEqual(item.Allergens, []string{"GLUTEN", "MILK"}) || *item.ImageURL != "https://example.test/c.jpg" {
					t.Errorf("item = %+v", item)
				}
			},
		},
		{
			name: "a description of only spaces is dropped",
			change: func(m *Menu) {
				m.Sections[0].Items[0].Translations = MenuTranslations{"es": {Name: "Café Solo", Description: "   "}}
			},
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if rendered.Sections[0].Items[0].Description != "" {
					t.Errorf("description = %q", rendered.Sections[0].Items[0].Description)
				}
			},
		},
		{
			name:     "a hidden line is left out",
			change:   func(m *Menu) { m.Sections[0].Items[0].IsVisible = false },
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if len(rendered.Sections) != 0 {
					t.Errorf("sections = %+v", rendered.Sections)
				}
			},
		},
		{
			name:     "the product id stays, to answer stock later",
			language: "es",
			check: func(t *testing.T, rendered PublishedMenu) {
				if *rendered.Sections[0].Items[0].ProductID != "prod-1" {
					t.Errorf("product id = %v", rendered.Sections[0].Items[0].ProductID)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			menu := testMenu()
			if tt.change != nil {
				tt.change(&menu)
			}
			tt.check(t, menu.Render(tt.language))
		})
	}
}

func TestMenuRenderEveryLanguage(t *testing.T) {
	rendered := testMenu().RenderEveryLanguage()

	if len(rendered) != 2 || rendered["es"].Sections[0].Name != "Cafetería" || rendered["en"].Sections[0].Name != "Coffee" {
		t.Fatalf("rendered = %+v", rendered)
	}

	got, err := json.Marshal(rendered["es"])
	if err != nil {
		t.Fatal(err)
	}
	want := `{"name":"Carta","language":"es","languages":["es","en"],"sections":[{"name":"Cafetería","items":[{"name":"Café Solo","description":"Recién molido","price":120,"allergens":[],"productId":"prod-1"}]}]}`
	if string(got) != want {
		t.Errorf("JSON = %s\nwant   %s", got, want)
	}
}

func TestMenuHasUnpublishedChanges(t *testing.T) {
	published := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	before := NewTime(published.Add(-time.Minute))
	after := NewTime(published.Add(time.Minute))

	tests := []struct {
		name        string
		publishedAt *Time
		updatedAt   Time
		productAt   Time
		want        bool
	}{
		{name: "never published", updatedAt: before, productAt: before, want: true},
		{name: "nothing changed", publishedAt: menuPtr(NewTime(published)), updatedAt: NewTime(published), productAt: before, want: false},
		{name: "the draft changed", publishedAt: menuPtr(NewTime(published)), updatedAt: after, productAt: before, want: true},
		{name: "a product changed", publishedAt: menuPtr(NewTime(published)), updatedAt: before, productAt: after, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			menu := testMenu()
			menu.PublishedAt = tt.publishedAt
			menu.UpdatedAt = tt.updatedAt
			menu.Sections[0].Items[0].Product.UpdatedAt = tt.productAt

			if got := menu.HasUnpublishedChanges(); got != tt.want {
				t.Errorf("HasUnpublishedChanges = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMenuDraftJSON(t *testing.T) {
	menu := Menu{
		ID: "m1", Slug: "bar-pepe", Name: "Bar Pepe", DefaultLanguage: "es", Languages: []string{"es"},
		Sections: []MenuSection{{Items: []MenuItem{{Price: menuPtr(100), IsVisible: false}}}},
	}

	got, err := json.Marshal(menu.Draft())
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"m1","slug":"bar-pepe","name":"Bar Pepe","defaultLanguage":"es","languages":["es"],"hasUnpublishedChanges":true,"sections":[{"translations":{},"items":[{"price":100,"isVisible":false,"translations":{}}]}]}`
	if string(got) != want {
		t.Errorf("JSON = %s\nwant   %s", got, want)
	}
}

func TestSanitiseTranslations(t *testing.T) {
	tests := []struct {
		name    string
		input   map[string]any
		offered []string
		want    MenuTranslations
	}{
		{
			name:    "trims the words",
			input:   map[string]any{"es": map[string]any{"name": "  Café ", "description": " Molido "}},
			offered: []string{"es"},
			want:    MenuTranslations{"es": {Name: "Café", Description: "Molido"}},
		},
		{
			name:    "drops languages not offered or unknown",
			input:   map[string]any{"en": map[string]any{"name": "Coffee"}, "de": map[string]any{"name": "Kaffee"}},
			offered: []string{"es"},
			want:    MenuTranslations{},
		},
		{
			name:    "drops what is not text",
			input:   map[string]any{"es": map[string]any{"name": 5, "description": true}, "en": "Coffee"},
			offered: []string{"es", "en"},
			want:    MenuTranslations{},
		},
		{
			name:    "drops a wording left empty",
			input:   map[string]any{"es": map[string]any{"name": "   "}},
			offered: []string{"es"},
			want:    MenuTranslations{},
		},
		{
			name:    "cuts the name at 80 characters",
			input:   map[string]any{"es": map[string]any{"name": strings.Repeat("ñ", 100)}},
			offered: []string{"es"},
			want:    MenuTranslations{"es": {Name: strings.Repeat("ñ", 80)}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitiseTranslations(tt.input, tt.offered); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SanitiseTranslations = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestSlugify(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "strips accents rather than dropping the letters", in: "Café Ñandú", want: "cafe-nandu"},
		{name: "collapses punctuation and spacing", in: "  ¡¡El Rincón!!  ", want: "el-rincon"},
		{name: "never ends on a dash after the cut", in: strings.Repeat("a", 39) + " bar", want: strings.Repeat("a", 39)},
		{name: "nothing usable", in: "¡¡¡---!!!", want: ""},
		{name: "other Latin letters", in: "Crêperie Łódź Straße", want: "creperie-odz-stra-e"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Slugify(tt.in); got != tt.want {
				t.Errorf("Slugify(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestNextMenuSlug(t *testing.T) {
	tests := []struct {
		base  string
		taken []string
		want  string
	}{
		{base: "Bar Pepe", want: "bar-pepe"},
		{base: "Bar Pepe", taken: []string{"bar-pepe"}, want: "bar-pepe-2"},
		{base: "Bar Pepe", taken: []string{"bar-pepe", "bar-pepe-2"}, want: "bar-pepe-3"},
		{base: "¡¡¡!!!", want: "menu"},
	}

	for _, tt := range tests {
		if got := NextMenuSlug(tt.base, tt.taken); got != tt.want {
			t.Errorf("NextMenuSlug(%q, %v) = %q, want %q", tt.base, tt.taken, got, tt.want)
		}
	}
}
