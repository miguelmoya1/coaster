package e2e

import (
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestAdmin(t *testing.T) {
	other := user{id: "00000000-0000-4000-8000-00000000000f", email: "other@establishment.com", name: "Other"}

	setup := func(t *testing.T) {
		resetWithMockUser(t)
	}

	becomeAdmin := func(t *testing.T) {
		mustExec(t, `UPDATE "User" SET role = 'ADMIN' WHERE id = $1`, mockUser.id)
	}

	auditEntries := func(t *testing.T, where string, args ...any) int {
		deadline := time.Now().Add(time.Second)
		for {
			count := queryValue[int](t, `SELECT count(*) FROM "AdminAuditLog" WHERE `+where, args...)
			if count > 0 || time.Now().After(deadline) {
				return count
			}
			time.Sleep(25 * time.Millisecond)
		}
	}

	firstAuditItem := func(t *testing.T, api *app) map[string]any {
		items, _ := api.get(t, "/admin/audit").expect(t, http.StatusOK).object(t)["items"].([]any)
		if len(items) == 0 {
			t.Fatal("the audit is empty")
		}
		return items[0].(map[string]any)
	}

	adminRoutes := []string{"/admin/overview", "/admin/audit", "/admin/establishments", "/admin/users", "/admin/beta-testers"}

	t.Run("refuses every admin route to a plain user", func(t *testing.T) {
		api := newApp(t)
		setup(t)

		for _, route := range adminRoutes {
			api.get(t, route).expect(t, http.StatusForbidden)
		}
	})

	t.Run("opens every admin route to an admin", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		for _, route := range adminRoutes {
			api.get(t, route).expect(t, http.StatusOK)
		}
	})

	t.Run("refuses a plain user the write routes too", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		establishmentID := createEstablishment(t, "Someone elses establishment", withoutOwner())

		api.post(t, "/admin/establishments/"+establishmentID+"/plan", map[string]any{"plan": "PRO"}).expect(t, http.StatusForbidden)
		api.patch(t, "/admin/establishments/"+establishmentID, map[string]any{"name": "Hijacked"}).expect(t, http.StatusForbidden)
		api.post(t, "/admin/beta-testers", map[string]any{"email": "sneaky@bar.com"}).expect(t, http.StatusForbidden)
	})

	t.Run("a manual PRO grant lets a lapsed establishment write again, until revoked", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		owner := user{id: newID(), email: "owner@lapsed.com", name: "Owner"}
		createUser(t, owner)
		establishmentID := createEstablishment(t, "Lapsed establishment", ownedBy(owner.id, domain.EstablishmentRoleOwner))
		mustExec(t, `UPDATE "EstablishmentSubscription" SET status = 'INACTIVE', "trialEndsAt" = CURRENT_TIMESTAMP - interval '1 second' WHERE "establishmentId" = $1`, establishmentID)
		tables := "/establishments/" + establishmentID + "/tables"

		api.post(t, tables, map[string]any{"name": "T1"}, as(owner.id)).expect(t, http.StatusPaymentRequired)
		api.post(t, "/admin/establishments/"+establishmentID+"/plan", map[string]any{"plan": "PRO", "durationDays": 30, "reason": "Compensation"}).
			expect(t, http.StatusCreated)
		api.post(t, tables, map[string]any{"name": "T2"}, as(owner.id)).expect(t, http.StatusCreated)
		api.post(t, "/admin/establishments/"+establishmentID+"/plan/revoke", map[string]any{}).expect(t, http.StatusCreated)
		api.post(t, tables, map[string]any{"name": "T3"}, as(owner.id)).expect(t, http.StatusPaymentRequired)
	})

	t.Run("a grant keeps the Stripe columns untouched", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Stripe establishment")
		mustExec(t, `UPDATE "EstablishmentSubscription" SET "stripeCustomerId" = 'cus_keep', "stripeSubscriptionId" = 'sub_keep' WHERE "establishmentId" = $1`, establishmentID)

		api.post(t, "/admin/establishments/"+establishmentID+"/plan", map[string]any{"plan": "PRO"}).expect(t, http.StatusCreated)

		billing := queryValue[string](t, `SELECT concat_ws(' ', "stripeCustomerId", "stripeSubscriptionId", "manualPlan", ("manualGrantExpiresAt" IS NULL)::text)
			FROM "EstablishmentSubscription" WHERE "establishmentId" = $1`, establishmentID)
		if billing != "cus_keep sub_keep PRO true" {
			t.Errorf("billing = %s, want the Stripe ids kept and PRO with no end", billing)
		}
	})

	t.Run("refuses to revoke a grant that is not there", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "No grant")

		api.post(t, "/admin/establishments/"+establishmentID+"/plan/revoke", map[string]any{}).expect(t, http.StatusBadRequest)
	})

	t.Run("keeps the admin note away from the members", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Granted establishment")
		api.post(t, "/admin/establishments/"+establishmentID+"/plan", map[string]any{"plan": "PRO", "reason": "Friend of the founder"}).
			expect(t, http.StatusCreated)

		workspace := api.get(t, "/establishments/"+establishmentID+"/establishment-subscription").expect(t, http.StatusOK)

		if strings.Contains(string(workspace.body), "Friend of the founder") {
			t.Error("the members see the admin note")
		}
		expectExactly(t, "manualGrant", workspace.object(t)["manualGrant"].(map[string]any), map[string]any{"plan": "PRO", "expiresAt": nil})

		backoffice := api.get(t, "/admin/establishments/"+establishmentID).expect(t, http.StatusOK).object(t)
		grant := backoffice["subscription"].(map[string]any)["manualGrant"].(map[string]any)
		if grant["reason"] != "Friend of the founder" {
			t.Errorf("the backoffice note = %v, want it", grant["reason"])
		}
	})

	t.Run("lets an admin act on an establishment it does not belong to", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Foreign establishment", withoutOwner())

		if role := api.get(t, "/establishments/"+establishmentID+"/members/me").expect(t, http.StatusOK).object(t)["role"]; role != "OWNER" {
			t.Errorf("role = %v, want OWNER", role)
		}
		api.post(t, "/establishments/"+establishmentID+"/tables", map[string]any{"name": "T1"}).expect(t, http.StatusCreated)
	})

	t.Run("audits a role change an admin makes through the member route", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Foreign establishment", withoutOwner())
		createUser(t, other)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		api.patch(t, "/establishments/"+establishmentID+"/members/"+memberID, map[string]any{"role": "MANAGER"}).expect(t, http.StatusOK)

		if entries := auditEntries(t, "true"); entries != 1 {
			t.Fatalf("audit entries = %d, want 1", entries)
		}
		expectFields(t, "audit", firstAuditItem(t, api), map[string]any{
			"action": "ESTABLISHMENT_MEMBER_ROLE_CHANGED", "targetType": "ESTABLISHMENT", "targetId": establishmentID,
		})
	})

	t.Run("does not audit a role change made by an ordinary owner", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		establishmentID := createEstablishment(t, "My establishment")
		createUser(t, other)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		api.patch(t, "/establishments/"+establishmentID+"/members/"+memberID, map[string]any{"role": "MANAGER"}).expect(t, http.StatusOK)

		if entries := auditEntries(t, "true"); entries != 0 {
			t.Errorf("audit entries = %d, want 0", entries)
		}
	})

	t.Run("applies a module change from the backoffice and records who made it", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Supported establishment", withModules(domain.ModuleTimeTracking))

		var settings struct {
			Modules []string `json:"modules"`
		}
		api.patch(t, "/admin/establishments/"+establishmentID+"/modules", map[string]any{"modules": []string{"ORDERS"}}).
			expect(t, http.StatusOK).decode(t, &settings)

		if !slices.Contains(settings.Modules, "ORDERS") || !slices.Contains(settings.Modules, "INVENTORY") {
			t.Errorf("modules = %v, want ORDERS and INVENTORY among them", settings.Modules)
		}
		auditEntries(t, `"targetId" = $1`, establishmentID)
		entry := queryValue[string](t, `SELECT action || ' ' || "actorId" FROM "AdminAuditLog" WHERE "targetId" = $1`, establishmentID)
		if entry != "ESTABLISHMENT_MODULES_CHANGED "+mockUser.id {
			t.Errorf("audit = %s, want the module change by %s", entry, mockUser.id)
		}
	})

	t.Run("a module change from the backoffice takes effect straight away", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Supported establishment", withModules(domain.ModuleTimeTracking))

		api.patch(t, "/admin/establishments/"+establishmentID+"/modules", map[string]any{"modules": []string{"INVENTORY"}}).expect(t, http.StatusOK)

		api.get(t, "/establishments/"+establishmentID+"/products").expect(t, http.StatusOK)
	})

	t.Run("a module change from the backoffice leaves the owner's onboarding waiting", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		establishmentID := createEstablishment(t, "Never set up", withModules(domain.ModuleTimeTracking))

		api.patch(t, "/admin/establishments/"+establishmentID+"/modules", map[string]any{"modules": []string{"ORDERS"}}).expect(t, http.StatusOK)

		if configured := queryValue[bool](t, `SELECT "configuredAt" IS NOT NULL FROM "EstablishmentSettings" WHERE "establishmentId" = $1`, establishmentID); configured {
			t.Error("the establishment was marked configured")
		}
	})

	t.Run("refuses a module change from a plain user", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		establishmentID := createEstablishment(t, "Not yours", withoutOwner())

		api.patch(t, "/admin/establishments/"+establishmentID+"/modules", map[string]any{"modules": []string{"ORDERS"}}).expect(t, http.StatusForbidden)
	})

	t.Run("records an audit entry for every user change", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		createUser(t, other)

		api.patch(t, "/admin/users/"+other.id, map[string]any{"role": "ADMIN"}).expect(t, http.StatusOK)

		if entries := auditEntries(t, "true"); entries != 1 {
			t.Fatalf("audit entries = %d, want 1", entries)
		}
		expectFields(t, "audit", firstAuditItem(t, api), map[string]any{"action": "USER_ROLE_CHANGED", "targetType": "USER", "targetId": other.id})
	})

	t.Run("refuses an admin editing their own account", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		api.patch(t, "/admin/users/"+mockUser.id, map[string]any{"active": false}).expect(t, http.StatusBadRequest)
	})

	addTester := func(t *testing.T, api *app, body map[string]any) *response {
		return api.post(t, "/admin/beta-testers", body)
	}

	testers := func(t *testing.T, api *app, query string) map[string]any {
		return api.get(t, "/admin/beta-testers"+query).expect(t, http.StatusOK).object(t)
	}

	firstTester := func(list map[string]any) map[string]any {
		return list["items"].([]any)[0].(map[string]any)
	}

	t.Run("keeps the list of who may open an account", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		addTester(t, api, map[string]any{"email": "Tester@Bar.com", "note": "Bar Pepe"}).expect(t, http.StatusNoContent)

		list := testers(t, api, "")
		if list["total"] != float64(1) {
			t.Fatalf("total = %v, want 1", list["total"])
		}
		expectFields(t, "tester", firstTester(list), map[string]any{
			"email": "tester@bar.com", "note": "Bar Pepe", "invitedByName": mockUser.name, "userId": nil, "signedUpAt": nil,
		})
	})

	t.Run("says the list gates nothing while the switch is off", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		if enforcing := testers(t, api, "")["enforcing"]; enforcing != false {
			t.Errorf("enforcing = %v, want false", enforcing)
		}
	})

	t.Run("refuses the same address twice", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		addTester(t, api, map[string]any{"email": "tester@bar.com"}).expect(t, http.StatusNoContent)
		addTester(t, api, map[string]any{"email": "tester@bar.com"}).expect(t, http.StatusConflict)
	})

	t.Run("refuses something that is not an address", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		addTester(t, api, map[string]any{"email": "not-an-email"}).expect(t, http.StatusBadRequest)
	})

	t.Run("shows which invitations were already used", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		addTester(t, api, map[string]any{"email": mockUser.email}).expect(t, http.StatusNoContent)

		tester := firstTester(testers(t, api, ""))
		expectFields(t, "tester", tester, map[string]any{"email": mockUser.email, "userId": mockUser.id})
		if tester["signedUpAt"] == nil {
			t.Error("signedUpAt is empty")
		}
	})

	t.Run("drops an address and records who did it", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		addTester(t, api, map[string]any{"email": "tester@bar.com"}).expect(t, http.StatusNoContent)
		testerID := firstTester(testers(t, api, ""))["id"].(string)

		api.delete(t, "/admin/beta-testers/"+testerID).expect(t, http.StatusNoContent)

		if total := testers(t, api, "")["total"]; total != float64(0) {
			t.Errorf("total = %v, want 0", total)
		}
		if entries := auditEntries(t, `action = $1`, domain.AuditBetaTesterRemoved); entries == 0 {
			t.Fatal("the removal was not audited")
		}
		var actions []string
		for _, item := range api.get(t, "/admin/audit").expect(t, http.StatusOK).object(t)["items"].([]any) {
			actions = append(actions, item.(map[string]any)["action"].(string))
		}
		if !slices.Contains(actions, domain.AuditBetaTesterRemoved) {
			t.Errorf("audit actions = %v, want %s among them", actions, domain.AuditBetaTesterRemoved)
		}
	})

	t.Run("complains about removing an address that is not on the list", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)

		api.delete(t, "/admin/beta-testers/00000000-0000-4000-8000-0000000000ff").expect(t, http.StatusNotFound)
	})

	t.Run("finds a tester by the note as well as the address", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		becomeAdmin(t)
		addTester(t, api, map[string]any{"email": "tester@bar.com", "note": "Bar Pepe"}).expect(t, http.StatusNoContent)
		addTester(t, api, map[string]any{"email": "other@bar.com", "note": "Cafe Luna"}).expect(t, http.StatusNoContent)

		byNote := testers(t, api, "?q=Luna")

		if byNote["total"] != float64(1) || firstTester(byNote)["email"] != "other@bar.com" {
			t.Errorf("found %v, want only other@bar.com", byNote)
		}
	})
}
