package e2e

import (
	"net/http"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestEstablishments(t *testing.T) {
	api := newApp(t)

	t.Run("creates an establishment owned by the caller", func(t *testing.T) {
		resetWithMockUser(t)

		api.post(t, "/establishments", map[string]any{"name": "My New Establishment"}).expect(t, http.StatusCreated)

		if count := queryValue[int](t, `SELECT count(*) FROM "Establishment"`); count != 1 {
			t.Fatalf("establishments = %d, want 1", count)
		}
		name := queryValue[string](t, `SELECT name FROM "Establishment"`)
		members := queryValue[int](t, `SELECT count(*) FROM "EstablishmentMember"`)
		owner := queryValue[string](t, `SELECT "userId" || ' ' || role::text FROM "EstablishmentMember"`)
		if name != "My New Establishment" || members != 1 || owner != mockUser.id+" OWNER" {
			t.Errorf("establishment %q with %d members (%s), want it owned by %s", name, members, owner, mockUser.id)
		}
	})

	t.Run("rejects an invalid payload", func(t *testing.T) {
		resetWithMockUser(t)

		api.post(t, "/establishments", map[string]any{"name": "A"}).expect(t, http.StatusBadRequest)
	})

	t.Run("lists the establishments the caller belongs to", func(t *testing.T) {
		resetWithMockUser(t)
		id := createEstablishment(t, "Seeded Establishment", ownedBy(mockUser.id, domain.EstablishmentRoleStaff))

		establishments := api.get(t, "/establishments").expect(t, http.StatusOK).list(t)

		if len(establishments) != 1 || establishments[0]["id"] != id || establishments[0]["name"] != "Seeded Establishment" {
			t.Errorf("establishments = %v, want only %s", establishments, id)
		}
	})

	t.Run("returns an establishment the caller belongs to", func(t *testing.T) {
		resetWithMockUser(t)
		id := createEstablishment(t, "My Establishment", ownedBy(mockUser.id, domain.EstablishmentRoleManager))

		establishment := api.get(t, "/establishments/"+id).expect(t, http.StatusOK).object(t)

		if establishment["id"] != id || establishment["name"] != "My Establishment" {
			t.Errorf("establishment = %v, want %s", establishment, id)
		}
	})

	t.Run("refuses one the caller does not belong to", func(t *testing.T) {
		resetWithMockUser(t)
		id := createEstablishment(t, "Other Establishment", withoutOwner())

		api.get(t, "/establishments/"+id).expect(t, http.StatusForbidden)
	})
}
