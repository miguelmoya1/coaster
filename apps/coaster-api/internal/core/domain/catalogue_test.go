package domain

import (
	"reflect"
	"regexp"
	"strings"
	"testing"
)

func TestStarterCatalogueIsWellFormed(t *testing.T) {
	iconName := regexp.MustCompile(`^[a-z][a-z0-9_]*$`)
	keys := map[string]bool{}

	for _, category := range starterCatalogue {
		if keys[category.key] {
			t.Errorf("category key %q is used twice", category.key)
		}
		keys[category.key] = true

		if category.taxRate < 0 || category.taxRate > MaxTaxRate {
			t.Errorf("category %q has tax rate %d", category.key, category.taxRate)
		}
		if len(category.products) == 0 {
			t.Errorf("category %q has no products", category.key)
		}
		if !iconName.MatchString(category.icon) {
			t.Errorf("category %q has icon %q", category.key, category.icon)
		}

		entries := []map[string]string{category.names}
		for _, product := range category.products {
			entries = append(entries, product.names)

			if product.price <= 0 {
				t.Errorf("product %q costs %d", product.names["es"], product.price)
			}
			if !iconName.MatchString(product.icon) {
				t.Errorf("product %q has icon %q", product.names["es"], product.icon)
			}
			if product.taxRate != nil && (*product.taxRate < 0 || *product.taxRate > MaxTaxRate) {
				t.Errorf("product %q has tax rate %d", product.names["es"], *product.taxRate)
			}
		}

		for _, names := range entries {
			for _, language := range Languages {
				name := strings.TrimSpace(names[language])
				if name == "" || strings.HasPrefix(name, "templates.") {
					t.Errorf("%v has no word in %s", names, language)
				}
			}
		}
	}
}

func TestResolveCatalogue(t *testing.T) {
	tests := []struct {
		language     string
		wantCategory string
		wantProduct  string
	}{
		{language: "es", wantCategory: "Cafetería", wantProduct: "Café Solo"},
		{language: "en", wantCategory: "Coffee Shop", wantProduct: "Black Coffee"},
	}

	for _, tt := range tests {
		t.Run(tt.language, func(t *testing.T) {
			resolved := ResolveCatalogue(tt.language)

			if len(resolved) != 7 {
				t.Fatalf("categories = %d, want 7", len(resolved))
			}
			if resolved[0].Name != tt.wantCategory || resolved[0].Products[0].Name != tt.wantProduct {
				t.Errorf("first = %q / %q", resolved[0].Name, resolved[0].Products[0].Name)
			}

			products := 0
			for _, category := range resolved {
				products += len(category.Products)
				if category.TaxRate != 1000 || category.Icon == nil {
					t.Errorf("category %q: tax rate %d, icon %v", category.Key, category.TaxRate, category.Icon)
				}
				for _, product := range category.Products {
					if product.TaxRate != nil {
						t.Errorf("product %q overrides its category's tax rate", product.Name)
					}
				}
			}
			if products != 76 {
				t.Errorf("products = %d, want 76", products)
			}
		})
	}
}

func TestResolveCategories(t *testing.T) {
	tests := []struct {
		name string
		keys []string
		want []string
	}{
		{name: "only what was asked for", keys: []string{"cafeteria"}, want: []string{"cafeteria"}},
		{name: "unknown keys are ignored", keys: []string{"cafeteria", "sushi"}, want: []string{"cafeteria"}},
		{name: "catalogue order", keys: []string{"postres", "cervezas"}, want: []string{"cervezas", "postres"}},
		{name: "nothing it has", keys: []string{"sushi"}, want: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got []string
			for _, category := range ResolveCategories(tt.keys, "es") {
				got = append(got, category.Key)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("keys = %v, want %v", got, tt.want)
			}
		})
	}

	if !reflect.DeepEqual(ResolveCategories(nil, "es"), ResolveCatalogue("es")) {
		t.Error("no selection must be the whole catalogue")
	}
}
