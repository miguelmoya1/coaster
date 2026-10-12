package e2e

import (
	"net/http"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestRoleAccess(t *testing.T) {
	manager := user{id: "00000000-0000-4000-8000-0000000000a1", email: "manager@example.com", name: "Manager"}
	staff := user{id: "00000000-0000-4000-8000-0000000000a2", email: "staff@example.com", name: "Staff"}
	outsider := user{id: "00000000-0000-4000-8000-0000000000a3", email: "outsider@example.com", name: "Outsider"}

	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		createUser(t, manager)
		createUser(t, staff)
		createUser(t, outsider)
		establishmentID := createEstablishment(t, "The Bar")
		addMember(t, establishmentID, manager.id, domain.EstablishmentRoleManager)
		addMember(t, establishmentID, staff.id, domain.EstablishmentRoleStaff)
		mustExec(t, `INSERT INTO "Order" (id, "establishmentId", status, "totalAmount", "amountPaidCash", "paymentMethod", "updatedAt")
			VALUES ($1, $2, 'CLOSED', 1000, 1000, 'CASH', CURRENT_TIMESTAMP)`, newID(), establishmentID)
		return "/establishments/" + establishmentID
	}

	t.Run("hands the owner the whole picture, month and year included", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		stats := api.get(t, base+"/stats").expect(t, http.StatusOK).object(t)

		history, _ := stats["history"].(map[string]any)
		breakdown, _ := history["monthlyBreakdown"].([]any)
		if stats["todayRevenue"] != float64(1000) || history["yearlyRevenue"] != float64(1000) || len(breakdown) != 12 {
			t.Errorf("stats = %v, want 1000 today and in the year, and 12 months", stats)
		}
	})

	t.Run("gives the manager the daily takings but withholds the history", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		stats := api.get(t, base+"/stats", as(manager.id)).expect(t, http.StatusOK).object(t)

		expectFields(t, "stats", stats, map[string]any{"todayRevenue": 1000, "todayTicketCount": 1, "history": nil})
	})

	t.Run("leaks no figure of the year to a manager", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		body := string(api.get(t, base+"/stats", as(manager.id)).expect(t, http.StatusOK).body)

		for _, figure := range []string{"yearlyRevenue", "currentMonthRevenue", "monthlyBreakdown"} {
			if strings.Contains(body, figure) {
				t.Errorf("the manager sees %s", figure)
			}
		}
	})

	t.Run("refuses the takings to staff", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.get(t, base+"/stats", as(staff.id)).expect(t, http.StatusForbidden)
	})

	t.Run("refuses the takings to somebody who does not work there", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.get(t, base+"/stats", as(outsider.id)).expect(t, http.StatusForbidden)
	})

	t.Run("lets no manager touch the billing portal", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.post(t, base+"/establishment-subscription/customer-portal-session", map[string]any{}, as(manager.id)).
			expect(t, http.StatusForbidden)
	})

	t.Run("lets no staff member remove a colleague", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)
		membershipID := queryValue[string](t, `SELECT id FROM "EstablishmentMember" WHERE "userId" = $1`, manager.id)

		api.delete(t, base+"/members/"+membershipID, as(staff.id)).expect(t, http.StatusForbidden)
	})

	t.Run("lets staff read the shifts they are rostered for", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.get(t, base+"/shifts", as(staff.id)).expect(t, http.StatusOK)
	})

	t.Run("lets staff read their own time entries", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.get(t, base+"/time-entries/me?from=2026-01-01&to=2026-12-31", as(staff.id)).expect(t, http.StatusOK)
	})

	t.Run("keeps the team timesheet away from staff", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.get(t, base+"/time-entries?from=2026-01-01&to=2026-12-31", as(staff.id)).expect(t, http.StatusForbidden)
	})

	t.Run("records which staff member opened the order", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)
		establishmentID := strings.TrimPrefix(base, "/establishments/")
		productID := createProduct(t, createCategory(t, establishmentID, "Drinks"), product{name: "Beer", price: 250})

		api.post(t, base+"/orders", map[string]any{"items": []map[string]any{{"productId": productID, "quantity": 1}}}, as(staff.id)).
			expect(t, http.StatusCreated)

		if createdBy := queryValue[string](t, `SELECT "createdById" FROM "Order" WHERE status = 'OPEN'`); createdBy != staff.id {
			t.Errorf("createdById = %s, want %s", createdBy, staff.id)
		}
	})
}
