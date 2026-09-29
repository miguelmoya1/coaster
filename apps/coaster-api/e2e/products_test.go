package e2e

import (
	"net/http"
	"testing"
)

func TestProducts(t *testing.T) {
	setup := func(t *testing.T) (string, string) {
		resetWithMockUser(t)
		establishmentID := createEstablishment(t, "My Establishment")
		return establishmentID, createCategory(t, establishmentID, "Drinks")
	}

	t.Run("creates a product", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/products", map[string]any{
			"name": "Beer", "categoryId": categoryID, "price": 5, "currentStock": 100, "minStockAlert": 10,
		}).expect(t, http.StatusCreated)

		created := queryValue[string](t, `SELECT string_agg(name || ' ' || price || ' ' || "currentStock", ',') FROM "Product" WHERE "categoryId" = $1`, categoryID)
		if created != "Beer 5 100" {
			t.Errorf("products = %q, want Beer at 5 with 100 in stock", created)
		}
	})

	t.Run("rejects a product without a name", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/products", map[string]any{"categoryId": categoryID}).
			expect(t, http.StatusBadRequest)
	})

	t.Run("lists the products", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)
		productID := createProduct(t, categoryID, product{name: "Coke", price: 2})

		products := api.get(t, "/establishments/"+establishmentID+"/products").expect(t, http.StatusOK).list(t)

		if len(products) != 1 || products[0]["id"] != productID || products[0]["name"] != "Coke" || products[0]["price"] != float64(2) {
			t.Errorf("products = %v, want only %s, Coke at 2", products, productID)
		}
	})

	t.Run("updates a product", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)
		productID := createProduct(t, categoryID, product{name: "Old Name"})

		api.patch(t, "/establishments/"+establishmentID+"/products/"+productID, map[string]any{"name": "New Name", "price": 10}).
			expect(t, http.StatusOK)

		if updated := queryValue[string](t, `SELECT name || ' ' || price FROM "Product" WHERE id = $1`, productID); updated != "New Name 10" {
			t.Errorf("product = %q, want New Name at 10", updated)
		}
	})

	t.Run("updates the stock", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)
		productID := createProduct(t, categoryID, product{name: "Beer", stock: 10})

		api.patch(t, "/establishments/"+establishmentID+"/products/"+productID+"/stock", map[string]any{"currentStock": 5}).
			expect(t, http.StatusOK)

		if stock := queryValue[int](t, `SELECT "currentStock" FROM "Product" WHERE id = $1`, productID); stock != 5 {
			t.Errorf("stock = %d, want 5", stock)
		}
	})

	t.Run("deletes a product softly", func(t *testing.T) {
		api := newApp(t)
		establishmentID, categoryID := setup(t)
		productID := createProduct(t, categoryID, product{name: "To Delete"})

		api.delete(t, "/establishments/"+establishmentID+"/products/"+productID).expect(t, http.StatusOK)

		if deleted := queryValue[bool](t, `SELECT "deletedAt" IS NOT NULL FROM "Product" WHERE id = $1`, productID); !deleted {
			t.Error("the product is not marked as deleted")
		}
	})
}
