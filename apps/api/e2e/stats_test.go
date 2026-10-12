package e2e

import (
	"net/http"
	"testing"
)

func TestStats(t *testing.T) {
	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return createEstablishment(t, "My Establishment")
	}

	sellOneProduct := func(t *testing.T, api *app, price, discountPercentage, tipAmount int) float64 {
		establishmentID := setup(t)
		productID := createProduct(t, createCategory(t, establishmentID, "Drinks"), product{name: "Beer", price: price})
		orders := "/establishments/" + establishmentID + "/orders"

		api.post(t, orders, map[string]any{"items": []map[string]any{{"productId": productID, "quantity": 1}}}).
			expect(t, http.StatusCreated)
		orderID := queryValue[string](t, `SELECT id FROM "Order" WHERE "establishmentId" = $1 AND status = 'OPEN'`, establishmentID)

		if discountPercentage > 0 {
			api.post(t, orders+"/"+orderID+"/adjustments", map[string]any{"target": "ORDER", "type": "PERCENTAGE", "value": discountPercentage}).
				expect(t, http.StatusCreated)
		}
		if tipAmount > 0 {
			api.patch(t, orders+"/"+orderID+"/tip", map[string]any{"tipAmount": tipAmount}).expect(t, http.StatusOK)
		}
		api.post(t, orders+"/"+orderID+"/checkout", map[string]any{"paymentMethod": "CASH"}).expect(t, http.StatusCreated)

		return api.get(t, "/establishments/"+establishmentID+"/stats").expect(t, http.StatusOK).object(t)["todayRevenue"].(float64)
	}

	t.Run("reports what the till took, tax included", func(t *testing.T) {
		api := newApp(t)
		if revenue := sellOneProduct(t, api, 1000, 0, 0); revenue != 1100 {
			t.Errorf("todayRevenue = %v, want 1100", revenue)
		}
	})

	t.Run("reports what was charged after a discount", func(t *testing.T) {
		api := newApp(t)
		if revenue := sellOneProduct(t, api, 1000, 20, 0); revenue != 880 {
			t.Errorf("todayRevenue = %v, want 880", revenue)
		}
	})

	t.Run("does not count the tip as revenue", func(t *testing.T) {
		api := newApp(t)
		if revenue := sellOneProduct(t, api, 1000, 0, 300); revenue != 1100 {
			t.Errorf("todayRevenue = %v, want 1100", revenue)
		}
	})

	t.Run("returns every figure", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)
		mustExec(t, `INSERT INTO "Order" (id, "establishmentId", status, "totalAmount", "paymentMethod", "updatedAt")
			VALUES ($1, $3, 'CLOSED', 100, 'CASH', CURRENT_TIMESTAMP), ($2, $3, 'CLOSED', 50, 'CARD', CURRENT_TIMESTAMP)`,
			newID(), newID(), establishmentID)

		stats := api.get(t, "/establishments/"+establishmentID+"/stats").expect(t, http.StatusOK).object(t)

		for _, figure := range []string{"todayRevenue", "weeklyRevenue", "todayTicketCount", "todayAverageTicket"} {
			if _, ok := stats[figure]; !ok {
				t.Errorf("%s is missing", figure)
			}
		}
		history, _ := stats["history"].(map[string]any)
		for _, figure := range []string{"currentMonthRevenue", "yearlyRevenue", "monthlyBreakdown"} {
			if _, ok := history[figure]; !ok {
				t.Errorf("history.%s is missing", figure)
			}
		}
	})
}
