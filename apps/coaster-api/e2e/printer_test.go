package e2e

import (
	"net/http"
	"testing"
)

func TestPrinterPairing(t *testing.T) {
	api := newApp(t)

	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return createEstablishment(t, "Bar con impresora")
	}

	issueCode := func(t *testing.T, establishmentID string) string {
		body := api.post(t, "/establishments/"+establishmentID+"/printer/pairing", nil).expect(t, http.StatusCreated).object(t)
		return body["code"].(string)
	}

	pair := func(t *testing.T, code string) *response {
		return api.post(t, "/printer/pair", map[string]any{"code": code}, anonymous())
	}

	t.Run("turns a code into the ids a bridge needs", func(t *testing.T) {
		establishmentID := setup(t)

		body := pair(t, issueCode(t, establishmentID)).expect(t, http.StatusCreated).object(t)

		if body["establishmentId"] != establishmentID || body["deviceKey"] == "" || body["deviceKey"] == nil {
			t.Errorf("pairing = %v, want %s and a device key", body, establishmentID)
		}
	})

	t.Run("refuses the same code twice", func(t *testing.T) {
		code := issueCode(t, setup(t))

		pair(t, code).expect(t, http.StatusCreated)
		pair(t, code).expect(t, http.StatusNotFound)
	})

	t.Run("refuses a code that expired", func(t *testing.T) {
		code := issueCode(t, setup(t))
		mustExec(t, `UPDATE "PrinterPairing" SET "expiresAt" = CURRENT_TIMESTAMP - interval '1 second' WHERE code = $1`, code)

		pair(t, code).expect(t, http.StatusNotFound)
	})

	t.Run("refuses a code nobody issued", func(t *testing.T) {
		setup(t)

		pair(t, "ZZZZZZZZ").expect(t, http.StatusNotFound)
	})

	t.Run("gives the device key the establishment already prints with", func(t *testing.T) {
		establishmentID := setup(t)

		first := pair(t, issueCode(t, establishmentID)).expect(t, http.StatusCreated).object(t)
		second := pair(t, issueCode(t, establishmentID)).expect(t, http.StatusCreated).object(t)

		if second["deviceKey"] != first["deviceKey"] {
			t.Errorf("device keys %v and %v, want the same", first["deviceKey"], second["deviceKey"])
		}
	})
}
