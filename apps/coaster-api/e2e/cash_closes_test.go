package e2e

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestCashCloses(t *testing.T) {
	manager := user{id: "00000000-0000-4000-8000-0000000000b1", email: "manager@example.com", name: "Manager"}
	staff := user{id: "00000000-0000-4000-8000-0000000000b2", email: "staff@example.com", name: "Staff"}

	type bar struct {
		base      string
		id        string
		productID string
	}

	setup := func(t *testing.T) bar {
		resetWithMockUser(t)
		createUser(t, manager)
		createUser(t, staff)
		establishmentID := createEstablishment(t, "The Bar")
		addMember(t, establishmentID, manager.id, domain.EstablishmentRoleManager)
		addMember(t, establishmentID, staff.id, domain.EstablishmentRoleStaff)
		productID := createProduct(t, createCategory(t, establishmentID, "Drinks"), product{name: "Beer", price: 1000})
		return bar{base: "/establishments/" + establishmentID, id: establishmentID, productID: productID}
	}

	openOrder := func(t *testing.T, api *app, b bar) string {
		api.post(t, b.base+"/orders", map[string]any{"items": []map[string]any{{"productId": b.productID, "quantity": 1}}}).
			expect(t, http.StatusCreated)
		return queryValue[string](t, `SELECT id FROM "Order" WHERE "establishmentId" = $1 AND status = 'OPEN'
			ORDER BY "createdAt" DESC LIMIT 1`, b.id)
	}

	sell := func(t *testing.T, api *app, b bar, paymentMethod string, tipAmount int) string {
		orderID := openOrder(t, api, b)
		if tipAmount > 0 {
			api.patch(t, b.base+"/orders/"+orderID+"/tip", map[string]any{"tipAmount": tipAmount}).expect(t, http.StatusOK)
		}
		api.post(t, b.base+"/orders/"+orderID+"/checkout", map[string]any{"paymentMethod": paymentMethod}).expect(t, http.StatusCreated)
		return orderID
	}

	preview := func(t *testing.T, api *app, b bar) map[string]any {
		return api.get(t, b.base+"/cash-closes/preview").expect(t, http.StatusOK).object(t)
	}

	closeTill := func(t *testing.T, api *app, b bar, openingFloat, countedCash int) map[string]any {
		return api.post(t, b.base+"/cash-closes", map[string]any{"openingFloat": openingFloat, "countedCash": countedCash, "notes": "Sin incidencias"}).
			expect(t, http.StatusCreated).object(t)
	}

	t.Run("previews what the till took since the last close, by how it was paid", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		sell(t, api, b, "CASH", 200)
		sell(t, api, b, "CARD", 0)
		cancelledID := openOrder(t, api, b)
		api.post(t, b.base+"/orders/"+cancelledID+"/cancel", nil).expect(t, http.StatusCreated)

		expectExactly(t, "preview", preview(t, api, b), map[string]any{
			"closedOrders": 2, "cancelledOrders": 1, "cancelledAmount": 1100, "cashAmount": 1300, "cardAmount": 1100,
			"tipAmount": 200, "since": nil, "openOrders": 0, "openOrdersCharged": 0, "openingFloat": 0,
		})
	})

	t.Run("closes with the count and starts the next close where it ended", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		sell(t, api, b, "CASH", 0)
		sell(t, api, b, "CASH", 0)

		cashClose := closeTill(t, api, b, 15000, 17100)

		expectFields(t, "close", cashClose, map[string]any{
			"closedById": mockUser.id, "closedByName": mockUser.name, "since": nil, "closedOrders": 2, "cashAmount": 2200,
			"openingFloat": 15000, "countedCash": 17100, "expectedCash": 17200, "difference": -100, "notes": "Sin incidencias",
		})

		expectFields(t, "next preview", preview(t, api, b), map[string]any{
			"closedOrders": 0, "cashAmount": 0, "since": cashClose["closedAt"], "openingFloat": 15000,
		})

		history := api.get(t, b.base+"/cash-closes").expect(t, http.StatusOK).list(t)
		if len(history) != 1 || history[0]["id"] != cashClose["id"] {
			t.Errorf("history = %v, want only %v", history, cashClose["id"])
		}
	})

	t.Run("lists the closes of a day", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		sell(t, api, b, "CASH", 0)
		cashClose := closeTill(t, api, b, 0, 1100)
		today := domain.WorkdayDateOf(time.Now())
		yesterday := domain.WorkdayDateOf(time.Now().AddDate(0, 0, -1))

		closes := api.get(t, b.base+"/cash-closes?date="+today).expect(t, http.StatusOK).list(t)
		if len(closes) != 1 || closes[0]["id"] != cashClose["id"] || closes[0]["expectedCash"] != float64(1100) {
			t.Errorf("closes of today = %v, want only %v", closes, cashClose["id"])
		}

		if closes := api.get(t, b.base+"/cash-closes?date="+yesterday).expect(t, http.StatusOK).list(t); len(closes) != 0 {
			t.Errorf("closes of yesterday = %v, want none", closes)
		}

		messageContains(t, api.get(t, b.base+"/cash-closes?date=ayer").expect(t, http.StatusBadRequest), domain.CodeInvalidDate)
	})

	t.Run("leaves an open order out, warns about what it charged and counts it once paid", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		tabID := openOrder(t, api, b)
		itemID := queryValue[string](t, `SELECT id FROM "OrderItem" WHERE "orderId" = $1`, tabID)
		api.patch(t, b.base+"/orders/"+tabID+"/items/bulk", map[string]any{
			"items": []map[string]any{{"itemId": itemID, "paidQuantity": 1, "paymentMethod": "CASH"}},
		}).expect(t, http.StatusOK)

		expectFields(t, "preview", preview(t, api, b), map[string]any{"openOrders": 1, "openOrdersCharged": 1100})

		expectFields(t, "first close", closeTill(t, api, b, 0, 0), map[string]any{"closedOrders": 0})

		api.post(t, b.base+"/orders/"+tabID+"/checkout", map[string]any{"paymentMethod": "CASH"}).expect(t, http.StatusCreated)

		expectFields(t, "second close", closeTill(t, api, b, 0, 1100), map[string]any{"closedOrders": 1, "cashAmount": 1100, "difference": 0})
	})

	t.Run("refuses to delete an order a close has counted", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		orderID := sell(t, api, b, "CASH", 0)
		closeTill(t, api, b, 0, 1100)

		response := api.delete(t, b.base+"/orders/"+orderID).expect(t, http.StatusBadRequest)

		if !strings.Contains(string(response.body), string(domain.CodeOrderInCashClose)) {
			t.Errorf("body = %s, want %s", response.body, domain.CodeOrderInCashClose)
		}
		if count := queryValue[int](t, `SELECT count(*) FROM "Order" WHERE id = $1`, orderID); count != 1 {
			t.Error("the order was deleted")
		}
	})

	t.Run("undoes the last close, keeps it in the history and gives its orders back to the till", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		sell(t, api, b, "CASH", 0)
		sell(t, api, b, "CASH", 0)
		first := closeTill(t, api, b, 15000, 17200)
		sell(t, api, b, "CASH", 0)
		second := closeTill(t, api, b, 15000, 16000)

		messageContains(t, api.post(t, b.base+"/cash-closes/"+first["id"].(string)+"/void", nil).expect(t, http.StatusBadRequest), domain.CodeCashCloseNotLast)

		voided := api.post(t, b.base+"/cash-closes/"+second["id"].(string)+"/void", nil, as(staff.id)).expect(t, http.StatusCreated).object(t)
		expectFields(t, "voided", voided, map[string]any{
			"id": second["id"], "closedOrders": 1, "cashAmount": 1100, "countedCash": 16000,
			"voidedById": staff.id, "voidedByName": staff.name,
		})
		if voided["voidedAt"] == nil {
			t.Errorf("voidedAt = nil")
		}

		expectFields(t, "preview", preview(t, api, b), map[string]any{
			"closedOrders": 1, "cashAmount": 1100, "since": first["closedAt"], "openingFloat": 15000,
		})

		history := api.get(t, b.base+"/cash-closes").expect(t, http.StatusOK).list(t)
		if len(history) != 2 || history[0]["id"] != second["id"] || history[0]["voidedByName"] != staff.name || history[1]["voidedAt"] != nil {
			t.Errorf("history = %v, want the voided close on top of the first", history)
		}

		messageContains(t, api.post(t, b.base+"/cash-closes/"+second["id"].(string)+"/void", nil).expect(t, http.StatusBadRequest), domain.CodeCashCloseAlreadyVoided)
		messageContains(t, api.post(t, b.base+"/cash-closes/"+newID()+"/void", nil).expect(t, http.StatusNotFound), domain.CodeCashCloseNotFound)

		expectFields(t, "close after the void", closeTill(t, api, b, 15000, 16100), map[string]any{
			"since": first["closedAt"], "closedOrders": 1, "cashAmount": 1100, "difference": 0,
		})
	})

	t.Run("lets anyone on the staff close the till", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		empty := map[string]any{"openingFloat": 0, "countedCash": 0}

		for _, member := range []user{manager, staff} {
			api.get(t, b.base+"/cash-closes/preview", as(member.id)).expect(t, http.StatusOK)
			api.post(t, b.base+"/cash-closes", empty, as(member.id)).expect(t, http.StatusCreated)
			api.get(t, b.base+"/cash-closes", as(member.id)).expect(t, http.StatusOK)
		}
	})

	t.Run("rejects a negative count", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)

		api.post(t, b.base+"/cash-closes", map[string]any{"openingFloat": 0, "countedCash": -1}).expect(t, http.StatusBadRequest)
	})
}
