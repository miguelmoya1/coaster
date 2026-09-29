package e2e

import (
	"net/http"
	"testing"
)

func TestTables(t *testing.T) {
	api := newApp(t)

	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return createEstablishment(t, "My Establishment")
	}

	createTable := func(t *testing.T, establishmentID, name string) string {
		id := newID()
		mustExec(t, `INSERT INTO "Table" (id, name, "establishmentId", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
			id, name, establishmentID)
		return id
	}

	t.Run("creates a table", func(t *testing.T) {
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/tables", map[string]any{"name": "Table 1"}).
			expect(t, http.StatusCreated)

		if count := queryValue[int](t, `SELECT count(*) FROM "Table" WHERE "establishmentId" = $1`, establishmentID); count != 1 {
			t.Fatalf("tables = %d, want 1", count)
		}
		name := queryValue[string](t, `SELECT name FROM "Table" WHERE "establishmentId" = $1`, establishmentID)
		status := queryValue[string](t, `SELECT status::text FROM "Table" WHERE "establishmentId" = $1`, establishmentID)
		if name != "Table 1" || status != "FREE" {
			t.Errorf("table = %q %s, want %q FREE", name, status, "Table 1")
		}
	})

	t.Run("rejects an invalid payload", func(t *testing.T) {
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/tables", map[string]any{}).expect(t, http.StatusBadRequest)
	})

	t.Run("lists the tables", func(t *testing.T) {
		establishmentID := setup(t)
		tableID := createTable(t, establishmentID, "Table 2")

		tables := api.get(t, "/establishments/"+establishmentID+"/tables").expect(t, http.StatusOK).list(t)

		if len(tables) != 1 || tables[0]["id"] != tableID || tables[0]["name"] != "Table 2" {
			t.Errorf("tables = %v, want only %s named Table 2", tables, tableID)
		}
	})

	t.Run("renames a table", func(t *testing.T) {
		establishmentID := setup(t)
		tableID := createTable(t, establishmentID, "Old Name")

		api.patch(t, "/establishments/"+establishmentID+"/tables/"+tableID, map[string]any{"name": "New Name"}).
			expect(t, http.StatusOK)

		if name := queryValue[string](t, `SELECT name FROM "Table" WHERE id = $1`, tableID); name != "New Name" {
			t.Errorf("name = %q, want New Name", name)
		}
	})

	t.Run("deletes a table", func(t *testing.T) {
		establishmentID := setup(t)
		tableID := createTable(t, establishmentID, "To Delete")

		api.delete(t, "/establishments/"+establishmentID+"/tables/"+tableID).expect(t, http.StatusOK)

		if count := queryValue[int](t, `SELECT count(*) FROM "Table" WHERE id = $1`, tableID); count != 0 {
			t.Errorf("the table is still there")
		}
	})
}
