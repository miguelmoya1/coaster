package e2e

import (
	"net/http"
	"testing"
)

func TestPrinterPairing(t *testing.T) {
	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return createEstablishment(t, "Bar con impresora")
	}

	issueCode := func(t *testing.T, api *app, establishmentID string) string {
		body := api.post(t, "/establishments/"+establishmentID+"/printer/pairing", nil).expect(t, http.StatusCreated).object(t)
		return body["code"].(string)
	}

	pair := func(t *testing.T, api *app, code string) *response {
		return api.post(t, "/printer/pair", map[string]any{"code": code}, anonymous())
	}

	t.Run("turns a code into the ids a bridge needs", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		body := pair(t, api, issueCode(t, api, establishmentID)).expect(t, http.StatusCreated).object(t)

		if body["establishmentId"] != establishmentID || body["deviceKey"] == "" || body["deviceKey"] == nil {
			t.Errorf("pairing = %v, want %s and a device key", body, establishmentID)
		}
	})

	t.Run("refuses the same code twice", func(t *testing.T) {
		api := newApp(t)
		code := issueCode(t, api, setup(t))

		pair(t, api, code).expect(t, http.StatusCreated)
		pair(t, api, code).expect(t, http.StatusNotFound)
	})

	t.Run("refuses a code that expired", func(t *testing.T) {
		api := newApp(t)
		code := issueCode(t, api, setup(t))
		mustExec(t, `UPDATE "PrinterPairing" SET "expiresAt" = CURRENT_TIMESTAMP - interval '1 second' WHERE code = $1`, code)

		pair(t, api, code).expect(t, http.StatusNotFound)
	})

	t.Run("refuses a code nobody issued", func(t *testing.T) {
		api := newApp(t)
		setup(t)

		pair(t, api, "ZZZZZZZZ").expect(t, http.StatusNotFound)
	})

	t.Run("gives the device key the establishment already prints with", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		first := pair(t, api, issueCode(t, api, establishmentID)).expect(t, http.StatusCreated).object(t)
		second := pair(t, api, issueCode(t, api, establishmentID)).expect(t, http.StatusCreated).object(t)

		if second["deviceKey"] != first["deviceKey"] {
			t.Errorf("device keys %v and %v, want the same", first["deviceKey"], second["deviceKey"])
		}
	})
}

func TestPrintOrder(t *testing.T) {
	t.Run("answers an order that does not exist without failing", func(t *testing.T) {
		api := newApp(t)
		resetWithMockUser(t)
		establishmentID := createEstablishment(t, "My Establishment")

		response := api.post(t, "/establishments/"+establishmentID+"/printers/print-order", map[string]any{"orderId": "non-existing-order-id"})

		if response.status != http.StatusNotFound && response.status != http.StatusBadRequest && response.status != http.StatusCreated {
			t.Errorf("status = %d, want 404, 400 or 201: %s", response.status, response.body)
		}
	})
}
