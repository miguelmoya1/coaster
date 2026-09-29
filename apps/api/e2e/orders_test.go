package e2e

import (
	"bytes"
	"net/http"
	"slices"
	"sync"
	"testing"
)

func TestOrders(t *testing.T) {
	type shop struct {
		base    string
		id      string
		tableID string
		beerID  string
		cokeID  string
	}

	setup := func(t *testing.T) shop {
		resetWithMockUser(t)
		id := createEstablishment(t, "My Establishment")
		tableID := newID()
		mustExec(t, `INSERT INTO "Table" (id, name, "establishmentId", "updatedAt") VALUES ($1, 'Table 1', $2, CURRENT_TIMESTAMP)`, tableID, id)
		categoryID := createCategory(t, id, "Drinks")
		return shop{
			base:    "/establishments/" + id,
			id:      id,
			tableID: tableID,
			beerID:  createProduct(t, categoryID, product{name: "Beer", price: 5}),
			cokeID:  createProduct(t, categoryID, product{name: "Coke", price: 3}),
		}
	}

	orderRow := func(t *testing.T, orderID, columns string) string {
		return queryValue[string](t, `SELECT `+columns+` FROM "Order" WHERE id = $1`, orderID)
	}

	itemsOf := func(t *testing.T, orderID string) int {
		return queryValue[int](t, `SELECT count(*) FROM "OrderItem" WHERE "orderId" = $1`, orderID)
	}

	t.Run("creates an order with items", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		api.post(t, s.base+"/orders", map[string]any{"tableId": s.tableID, "items": []map[string]any{
			{"productId": s.beerID, "quantity": 2}, {"productId": s.cokeID, "quantity": 1},
		}}).expect(t, http.StatusCreated)

		orderID := queryValue[string](t, `SELECT id FROM "Order" WHERE "establishmentId" = $1`, s.id)
		if row := orderRow(t, orderID, `"tableId" || ' ' || status::text || ' ' || "totalAmount"`); row != s.tableID+" OPEN 13" {
			t.Errorf("order = %s, want an open order of 13 at the table", row)
		}
		if items := itemsOf(t, orderID); items != 2 {
			t.Errorf("items = %d, want 2", items)
		}
	})

	t.Run("rejects an order without items", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		api.post(t, s.base+"/orders", map[string]any{"items": []any{}}).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses a product of another establishment, leaving its stock alone", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		otherID := createEstablishment(t, "Other Establishment", withoutOwner())
		theirs := createProduct(t, createCategory(t, otherID, "Their drinks"), product{name: "Their beer", price: 5, stock: 10})

		api.post(t, s.base+"/orders", map[string]any{"items": []map[string]any{{"productId": theirs, "quantity": 4}}}).
			expect(t, http.StatusNotFound)

		orders := queryValue[int](t, `SELECT count(*) FROM "Order" WHERE "establishmentId" = $1`, s.id)
		stock := queryValue[int](t, `SELECT "currentStock" FROM "Product" WHERE id = $1`, theirs)
		if orders != 0 || stock != 10 {
			t.Errorf("orders = %d, their stock = %d, want 0 and 10", orders, stock)
		}
	})

	t.Run("refuses a product deleted from the menu", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		mustExec(t, `UPDATE "Product" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1`, s.beerID)

		api.post(t, s.base+"/orders", map[string]any{"items": []map[string]any{{"productId": s.beerID, "quantity": 1}}}).
			expect(t, http.StatusNotFound)
	})

	t.Run("accepts the same product on two lines", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		api.post(t, s.base+"/orders", map[string]any{"items": []map[string]any{
			{"productId": s.beerID, "quantity": 2}, {"productId": s.beerID, "quantity": 1, "notes": "sin hielo"},
		}}).expect(t, http.StatusCreated)

		orderID := queryValue[string](t, `SELECT id FROM "Order" WHERE "establishmentId" = $1`, s.id)
		if items, total := itemsOf(t, orderID), orderRow(t, orderID, `"totalAmount"::text`); items != 2 || total != "15" {
			t.Errorf("%d items for %s, want 2 for 15", items, total)
		}
	})

	t.Run("lists the orders", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{tableID: s.tableID, totalAmount: 5})
		addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 1, price: 5})

		orders := api.get(t, s.base+"/orders").expect(t, http.StatusOK).list(t)

		if len(orders) != 1 || orders[0]["id"] != orderID || orders[0]["totalAmount"] != float64(5) {
			t.Errorf("orders = %v, want only %s of 5", orders, orderID)
		}
	})

	t.Run("adds items to an existing order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{})

		api.post(t, s.base+"/orders/"+orderID+"/items", map[string]any{"items": []map[string]any{{"productId": s.beerID, "quantity": 1}}}).
			expect(t, http.StatusCreated)

		if items, total := itemsOf(t, orderID), orderRow(t, orderID, `"totalAmount"::text`); items != 1 || total != "5" {
			t.Errorf("%d items for %s, want 1 for 5", items, total)
		}
	})

	t.Run("cancels an order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{totalAmount: 5})
		addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 1, price: 5})

		api.post(t, s.base+"/orders/"+orderID+"/cancel", nil).expect(t, http.StatusCreated)

		if status := orderRow(t, orderID, `status::text`); status != "CANCELLED" {
			t.Errorf("status = %s, want CANCELLED", status)
		}
	})

	t.Run("checks an order out", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{totalAmount: 5})
		addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 1, price: 5, served: 1})

		api.post(t, s.base+"/orders/"+orderID+"/checkout", map[string]any{"paymentMethod": "CASH"}).expect(t, http.StatusCreated)

		if row := orderRow(t, orderID, `status::text || ' ' || "paymentMethod"::text`); row != "CLOSED CASH" {
			t.Errorf("order = %s, want CLOSED CASH", row)
		}
	})

	t.Run("merging carries payments, tips and discounts over to the surviving order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		first := createOrder(t, s.id, order{totalAmount: 10, amountPaidCash: 400, tipAmount: 50})
		addOrderItem(t, first, orderItem{productID: s.beerID, quantity: 2, price: 5})
		addAdjustment(t, first, "ORDER", "PERCENTAGE", 10)
		second := createOrder(t, s.id, order{totalAmount: 3, amountPaidCard: 200, tipAmount: 25})
		addOrderItem(t, second, orderItem{productID: s.cokeID, quantity: 1, price: 3})

		api.post(t, s.base+"/orders/merge", map[string]any{"orderIds": []string{first, second}}).expect(t, http.StatusCreated)

		if cancelled := queryValue[int](t, `SELECT count(*) FROM "Order" WHERE "establishmentId" = $1 AND status = 'CANCELLED'`, s.id); cancelled != 1 {
			t.Errorf("cancelled = %d, want 1", cancelled)
		}
		survivor := queryValue[string](t, `SELECT id FROM "Order" WHERE "establishmentId" = $1 AND status = 'OPEN'`, s.id)
		row := orderRow(t, survivor, `concat_ws(' ', "totalAmount", "amountPaidCash", "amountPaidCard", "tipAmount", "paymentMethod")`)
		adjustments := queryValue[int](t, `SELECT count(*) FROM "OrderAdjustment" WHERE "orderId" = $1`, survivor)
		if itemsOf(t, survivor) != 2 || row != "13 400 200 75 MIXED" || adjustments != 1 {
			t.Errorf("survivor = %s with %d items and %d adjustments, want 13 400 200 75 MIXED, 2 and 1", row, itemsOf(t, survivor), adjustments)
		}
	})

	t.Run("merging keeps a percentage discount worth the same euros", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		discounted := createOrder(t, s.id, order{totalAmount: 1000})
		addOrderItem(t, discounted, orderItem{productID: s.beerID, quantity: 200, price: 5})
		addAdjustment(t, discounted, "ORDER", "PERCENTAGE", 10)
		plain := createOrder(t, s.id, order{totalAmount: 3})
		addOrderItem(t, plain, orderItem{productID: s.cokeID, quantity: 1, price: 3})

		api.post(t, s.base+"/orders/merge", map[string]any{"orderIds": []string{discounted, plain}}).expect(t, http.StatusCreated)

		if adjustments := queryValue[[]string](t, `SELECT array_agg(type::text || ' ' || value) FROM "OrderAdjustment"`); !slices.Equal(adjustments, []string{"FIXED_AMOUNT 100"}) {
			t.Errorf("adjustments = %v, want one fixed discount of 100", adjustments)
		}
	})

	bulk := func(t *testing.T, api *app, s shop, orderID string, change map[string]any) *response {
		return api.patch(t, s.base+"/orders/"+orderID+"/items/bulk", map[string]any{"items": []map[string]any{change}})
	}

	openOrder := func(t *testing.T, s shop) (string, string) {
		orderID := createOrder(t, s.id, order{totalAmount: 1000})
		return orderID, addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 2, price: 500})
	}

	t.Run("marks an item as served", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, itemID := openOrder(t, s)

		bulk(t, api, s, orderID, map[string]any{"itemId": itemID, "servedQuantity": 2}).expect(t, http.StatusOK)

		if item := queryValue[string](t, `SELECT "servedQuantity" || ' ' || "deliveryStatus"::text FROM "OrderItem" WHERE id = $1`, itemID); item != "2 SERVED" {
			t.Errorf("item = %s, want 2 SERVED", item)
		}
	})

	t.Run("takes payment for part of an item, at the price with tax", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, itemID := openOrder(t, s)

		bulk(t, api, s, orderID, map[string]any{"itemId": itemID, "paidQuantity": 1, "paymentMethod": "CARD"}).expect(t, http.StatusOK)

		item := queryValue[string](t, `SELECT concat_ws(' ', "paidQuantity", "paidQuantityCard", "paymentStatus") FROM "OrderItem" WHERE id = $1`, itemID)
		if item != "1 1 PARTIAL" || orderRow(t, orderID, `"amountPaidCard"::text`) != "550" {
			t.Errorf("item = %s, card = %s, want 1 1 PARTIAL and 550", item, orderRow(t, orderID, `"amountPaidCard"::text`))
		}
	})

	t.Run("refuses to serve more units than the order has", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, itemID := openOrder(t, s)

		bulk(t, api, s, orderID, map[string]any{"itemId": itemID, "servedQuantity": 5}).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses to touch the items of a closed order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, itemID := openOrder(t, s)
		mustExec(t, `UPDATE "Order" SET status = 'CLOSED' WHERE id = $1`, orderID)

		bulk(t, api, s, orderID, map[string]any{"itemId": itemID, "servedQuantity": 1}).expect(t, http.StatusBadRequest)
	})

	t.Run("takes the money once when two people close the same order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{totalAmount: 1000})
		addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 1, price: 1000})
		token := api.token(t, defaultUserID)

		statuses := make([]int, 2)
		var wg sync.WaitGroup
		for i := range statuses {
			wg.Go(func() {
				request, _ := http.NewRequest(http.MethodPost, api.url+"/api/v1"+s.base+"/orders/"+orderID+"/checkout",
					bytes.NewReader([]byte(`{"paymentMethod":"CASH"}`)))
				request.Header.Set("Content-Type", "application/json")
				request.Header.Set("Authorization", "Bearer "+token)
				if response, err := http.DefaultClient.Do(request); err == nil {
					statuses[i] = response.StatusCode
					response.Body.Close()
				}
			})
		}
		wg.Wait()

		slices.Sort(statuses)
		if !slices.Equal(statuses, []int{http.StatusCreated, http.StatusBadRequest}) {
			t.Errorf("statuses = %v, want one 201 and one 400", statuses)
		}
		if row := orderRow(t, orderID, `status::text || ' ' || "amountPaidCash"`); row != "CLOSED 1100" {
			t.Errorf("order = %s, want CLOSED 1100", row)
		}
	})

	t.Run("refuses a payment method that says nothing about how it was paid", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{totalAmount: 500})

		api.post(t, s.base+"/orders/"+orderID+"/checkout", map[string]any{"paymentMethod": "NONE"}).expect(t, http.StatusBadRequest)

		if status := orderRow(t, orderID, `status::text`); status != "OPEN" {
			t.Errorf("status = %s, want OPEN", status)
		}
	})

	closedOrder := func(t *testing.T, s shop) (string, string) {
		orderID := createOrder(t, s.id, order{status: "CLOSED", totalAmount: 10, amountPaidCash: 10})
		addOrderItem(t, orderID, orderItem{productID: s.beerID, quantity: 2, price: 5, paid: 2})
		return orderID, addAdjustment(t, orderID, "ORDER", "PERCENTAGE", 10)
	}

	adjustmentsOf := func(t *testing.T, orderID string) int {
		return queryValue[int](t, `SELECT count(*) FROM "OrderAdjustment" WHERE "orderId" = $1`, orderID)
	}

	t.Run("a closed order refuses a new discount", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, _ := closedOrder(t, s)

		api.post(t, s.base+"/orders/"+orderID+"/adjustments", map[string]any{"target": "ORDER", "type": "PERCENTAGE", "value": 50}).
			expect(t, http.StatusBadRequest)

		if adjustments := adjustmentsOf(t, orderID); adjustments != 1 {
			t.Errorf("adjustments = %d, want 1", adjustments)
		}
	})

	t.Run("a closed order refuses removing the discount it was closed with", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, adjustmentID := closedOrder(t, s)

		api.delete(t, s.base+"/orders/"+orderID+"/adjustments/"+adjustmentID).expect(t, http.StatusBadRequest)

		if adjustments := adjustmentsOf(t, orderID); adjustments != 1 {
			t.Errorf("adjustments = %d, want 1", adjustments)
		}
	})

	t.Run("a closed order refuses changing the tip", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID, _ := closedOrder(t, s)

		api.patch(t, s.base+"/orders/"+orderID+"/tip", map[string]any{"tipAmount": 500}).expect(t, http.StatusBadRequest)

		if tip := orderRow(t, orderID, `"tipAmount"::text`); tip != "0" {
			t.Errorf("tip = %s, want 0", tip)
		}
	})

	t.Run("deletes an order", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		orderID := createOrder(t, s.id, order{status: "CLOSED"})

		api.delete(t, s.base+"/orders/"+orderID).expect(t, http.StatusOK)

		if count := queryValue[int](t, `SELECT count(*) FROM "Order" WHERE id = $1`, orderID); count != 0 {
			t.Error("the order is still there")
		}
	})
}
