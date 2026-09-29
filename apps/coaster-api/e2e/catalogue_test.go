package e2e

import (
	"net/http"
	"slices"
	"strings"
	"testing"
)

func TestCatalogue(t *testing.T) {
	api := newApp(t)

	setup := func(t *testing.T) string {
		resetDatabase(t)
		admin := mockUser
		admin.role = "ADMIN"
		createUser(t, admin)
		return createEstablishment(t, "My Establishment")
	}

	setLanguage := func(t *testing.T, establishmentID, language string) {
		mustExec(t, `UPDATE "EstablishmentSettings" SET language = $2 WHERE "establishmentId" = $1`, establishmentID, language)
	}

	catalogueOf := func(t *testing.T, establishmentID string) []map[string]any {
		return api.get(t, "/establishments/"+establishmentID+"/catalogue").expect(t, http.StatusOK).list(t)
	}

	importInto := func(t *testing.T, establishmentID string, body map[string]any) *response {
		return api.post(t, "/establishments/"+establishmentID+"/catalogue/import", body)
	}

	categoryNames := func(t *testing.T, establishmentID string) []string {
		return queryValue[[]string](t, `SELECT coalesce(array_agg(name), '{}') FROM "Category" WHERE "establishmentId" = $1`, establishmentID)
	}

	productNamesOf := func(t *testing.T, establishmentID string) []string {
		return queryValue[[]string](t, `SELECT coalesce(array_agg(p.name), '{}') FROM "Product" p
			JOIN "Category" c ON c.id = p."categoryId" WHERE c."establishmentId" = $1`, establishmentID)
	}

	t.Run("hands back words rather than translation keys", func(t *testing.T) {
		establishmentID := setup(t)

		var names []string
		for _, category := range catalogueOf(t, establishmentID) {
			names = append(names, category["name"].(string))
			for _, product := range category["products"].([]any) {
				names = append(names, product.(map[string]any)["name"].(string))
			}
		}

		if len(names) == 0 {
			t.Fatal("the catalogue is empty")
		}
		for _, name := range names {
			if strings.HasPrefix(name, "templates.") {
				t.Errorf("%q is a translation key", name)
			}
		}
	})

	t.Run("answers in the establishment language", func(t *testing.T) {
		establishmentID := setup(t)

		if name := catalogueOf(t, establishmentID)[0]["name"]; name != "Cafetería" {
			t.Errorf("first category = %v, want Cafetería", name)
		}

		setLanguage(t, establishmentID, "en")

		if name := catalogueOf(t, establishmentID)[0]["name"]; name != "Coffee Shop" {
			t.Errorf("first category = %v, want Coffee Shop", name)
		}
	})

	t.Run("creates the chosen categories with their products", func(t *testing.T) {
		establishmentID := setup(t)

		importInto(t, establishmentID, map[string]any{"categoryKeys": []string{"cafeteria"}}).expect(t, http.StatusCreated)

		if categories := categoryNames(t, establishmentID); !slices.Equal(categories, []string{"Cafetería"}) {
			t.Errorf("categories = %v, want [Cafetería]", categories)
		}
		if products := productNamesOf(t, establishmentID); !slices.Contains(products, "Café Solo") {
			t.Errorf("products = %v, want Café Solo among them", products)
		}
	})

	t.Run("takes no selection as the whole catalogue", func(t *testing.T) {
		establishmentID := setup(t)

		importInto(t, establishmentID, map[string]any{}).expect(t, http.StatusCreated)

		if categories := len(categoryNames(t, establishmentID)); categories != 7 {
			t.Errorf("categories = %d, want 7", categories)
		}
		if products := queryValue[int](t, `SELECT count(*) FROM "Product"`); products != 76 {
			t.Errorf("products = %d, want 76", products)
		}
	})

	t.Run("writes the establishment language into the rows", func(t *testing.T) {
		establishmentID := setup(t)
		setLanguage(t, establishmentID, "en")

		importInto(t, establishmentID, map[string]any{"categoryKeys": []string{"cafeteria"}}).expect(t, http.StatusCreated)

		if categories := categoryNames(t, establishmentID); !slices.Equal(categories, []string{"Coffee Shop"}) {
			t.Errorf("categories = %v, want [Coffee Shop]", categories)
		}
		if products := productNamesOf(t, establishmentID); !slices.Contains(products, "Black Coffee") {
			t.Errorf("products = %v, want Black Coffee among them", products)
		}
	})

	t.Run("duplicates nothing when the same import runs twice", func(t *testing.T) {
		establishmentID := setup(t)

		importInto(t, establishmentID, map[string]any{"categoryKeys": []string{"cafeteria"}}).expect(t, http.StatusCreated)
		importInto(t, establishmentID, map[string]any{"categoryKeys": []string{"cafeteria"}}).expect(t, http.StatusCreated)

		if categories := len(categoryNames(t, establishmentID)); categories != 1 {
			t.Errorf("categories = %d, want 1", categories)
		}
		if products := len(productNamesOf(t, establishmentID)); products != 8 {
			t.Errorf("products = %d, want 8", products)
		}
	})

	t.Run("rejects a selection naming nothing the catalogue has", func(t *testing.T) {
		establishmentID := setup(t)

		importInto(t, establishmentID, map[string]any{"categoryKeys": []string{"sushi"}}).expect(t, http.StatusBadRequest)

		if categories := categoryNames(t, establishmentID); len(categories) != 0 {
			t.Errorf("categories = %v, want none", categories)
		}
	})
}
