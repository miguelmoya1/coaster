package e2e

import (
	"net/http"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestModuleGating(t *testing.T) {
	type establishments struct {
		office string
		venue  string
	}

	setup := func(t *testing.T) establishments {
		resetWithMockUser(t)
		return establishments{
			office: "/establishments/" + createEstablishment(t, "Gestoría", withModules(domain.ModuleTimeTracking)),
			venue:  "/establishments/" + createEstablishment(t, "El Bar"),
		}
	}

	officeID := func(e establishments) string {
		return e.office[len("/establishments/"):]
	}

	settings := func(t *testing.T, api *app, e establishments, body map[string]any) *response {
		return api.patch(t, e.office+"/settings", body)
	}

	t.Run("an office with only time tracking has no tables", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		body := api.get(t, e.office+"/tables").expect(t, http.StatusForbidden).object(t)

		if body["message"] != domain.CodeModuleNotEnabled {
			t.Errorf("message = %v, want %s", body["message"], domain.CodeModuleNotEnabled)
		}
	})

	t.Run("an office cannot open an order", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.post(t, e.office+"/orders", map[string]any{}).expect(t, http.StatusForbidden)
	})

	t.Run("an office has no products", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.office+"/products").expect(t, http.StatusForbidden)
	})

	t.Run("an office has no categories", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.office+"/categories").expect(t, http.StatusForbidden)
	})

	t.Run("an office still lets its staff clock in", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.post(t, e.office+"/time-entries/clock", map[string]any{"type": "CLOCK_IN"}).expect(t, http.StatusCreated)
	})

	t.Run("an office still lists its members", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.office+"/members").expect(t, http.StatusOK)
	})

	t.Run("an office still lists its shifts", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.office+"/shifts?start=2026-01-01T00:00:00.000Z&end=2026-12-31T00:00:00.000Z").expect(t, http.StatusOK)
	})

	t.Run("a venue running everything lists its tables", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.venue+"/tables").expect(t, http.StatusOK)
	})

	t.Run("a venue running everything lists its products", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.venue+"/products").expect(t, http.StatusOK)
	})

	t.Run("switching a module on takes effect straight away", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		api.get(t, e.office+"/products").expect(t, http.StatusForbidden)
		settings(t, api, e, map[string]any{"modules": []string{"INVENTORY"}}).expect(t, http.StatusOK)
		api.get(t, e.office+"/products").expect(t, http.StatusOK)
	})

	t.Run("keeps what the owner asked about marking sold out", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		settings(t, api, e, map[string]any{"modules": []string{"INVENTORY"}, "markSoldOut": true}).expect(t, http.StatusOK)

		if markSoldOut := queryValue[bool](t, `SELECT "markSoldOut" FROM "EstablishmentSettings" WHERE "establishmentId" = $1`, officeID(e)); !markSoldOut {
			t.Error("markSoldOut was not saved")
		}
	})

	t.Run("hands the settings back on the response", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		body := settings(t, api, e, map[string]any{"modules": []string{"INVENTORY"}, "markSoldOut": true, "language": "en"}).
			expect(t, http.StatusOK).object(t)

		expectFields(t, "settings", body, map[string]any{"markSoldOut": true, "language": "en"})
	})

	t.Run("leaves marking sold out alone when the request does not mention it", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		settings(t, api, e, map[string]any{"modules": []string{"INVENTORY"}, "markSoldOut": true}).expect(t, http.StatusOK)
		settings(t, api, e, map[string]any{"modules": []string{"INVENTORY"}}).expect(t, http.StatusOK)

		if markSoldOut := queryValue[bool](t, `SELECT "markSoldOut" FROM "EstablishmentSettings" WHERE "establishmentId" = $1`, officeID(e)); !markSoldOut {
			t.Error("markSoldOut was reset")
		}
	})

	t.Run("refuses a member who is not an owner", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)
		staff := user{id: newID(), email: "staff@example.com", name: "Staff"}
		createUser(t, staff)
		addMember(t, officeID(e), staff.id, domain.EstablishmentRoleStaff)

		api.patch(t, e.office+"/settings", map[string]any{"modules": []string{"INVENTORY"}}, as(staff.id)).
			expect(t, http.StatusForbidden)
	})

	t.Run("refuses a module name it does not know", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)

		settings(t, api, e, map[string]any{"modules": []string{"RESERVATIONS"}}).expect(t, http.StatusBadRequest)
	})

	t.Run("marks the establishment configured", func(t *testing.T) {
		api := newApp(t)
		e := setup(t)
		configured := func() bool {
			return queryValue[bool](t, `SELECT "configuredAt" IS NOT NULL FROM "EstablishmentSettings" WHERE "establishmentId" = $1`, officeID(e))
		}

		if configured() {
			t.Fatal("a new establishment is already configured")
		}
		settings(t, api, e, map[string]any{"modules": []string{"ORDERS"}}).expect(t, http.StatusOK)
		if !configured() {
			t.Error("the establishment was not marked configured")
		}
	})

	t.Run("turns inventory on by itself when orders is asked for", func(t *testing.T) {
		resetWithMockUser(t)
		shopID := createEstablishment(t, "Solo comandas", withModules(domain.ModuleOrders))

		modules := queryValue[[]string](t, `SELECT modules::text[] FROM "EstablishmentSettings" WHERE "establishmentId" = $1`, shopID)
		if !slices.Contains(modules, "INVENTORY") {
			t.Errorf("modules = %v, want INVENTORY among them", modules)
		}
	})
}
