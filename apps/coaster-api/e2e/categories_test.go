package e2e

import (
	"net/http"
	"testing"
)

func TestCategories(t *testing.T) {
	api := newApp(t)

	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return createEstablishment(t, "My Establishment")
	}

	t.Run("creates a category", func(t *testing.T) {
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/categories", map[string]any{"name": "Drinks", "icon": "beer"}).
			expect(t, http.StatusCreated)

		category := queryValue[string](t, `SELECT string_agg(name || ' ' || icon, ',') FROM "Category" WHERE "establishmentId" = $1`, establishmentID)
		if category != "Drinks beer" {
			t.Errorf("categories = %q, want Drinks with the beer icon", category)
		}
	})

	t.Run("rejects an invalid payload", func(t *testing.T) {
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/categories", map[string]any{"name": ""}).expect(t, http.StatusBadRequest)
	})

	t.Run("lists the categories", func(t *testing.T) {
		establishmentID := setup(t)
		categoryID := createCategory(t, establishmentID, "Food")

		categories := api.get(t, "/establishments/"+establishmentID+"/categories").expect(t, http.StatusOK).list(t)

		if len(categories) != 1 || categories[0]["id"] != categoryID || categories[0]["name"] != "Food" {
			t.Errorf("categories = %v, want only %s named Food", categories, categoryID)
		}
	})

	t.Run("renames a category", func(t *testing.T) {
		establishmentID := setup(t)
		categoryID := createCategory(t, establishmentID, "Old Name")

		api.patch(t, "/establishments/"+establishmentID+"/categories/"+categoryID, map[string]any{"name": "New Name"}).
			expect(t, http.StatusOK)

		if name := queryValue[string](t, `SELECT name FROM "Category" WHERE id = $1`, categoryID); name != "New Name" {
			t.Errorf("name = %q, want New Name", name)
		}
	})

	t.Run("deletes a category softly", func(t *testing.T) {
		establishmentID := setup(t)
		categoryID := createCategory(t, establishmentID, "To Delete")

		api.delete(t, "/establishments/"+establishmentID+"/categories/"+categoryID).expect(t, http.StatusOK)

		if deleted := queryValue[bool](t, `SELECT "deletedAt" IS NOT NULL FROM "Category" WHERE id = $1`, categoryID); !deleted {
			t.Error("the category is not marked as deleted")
		}
	})
}
