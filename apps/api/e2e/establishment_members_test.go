package e2e

import (
	"net/http"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestEstablishmentMembers(t *testing.T) {
	other := user{id: "other-user-id", email: "other@example.com", name: "Other User"}

	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		createUser(t, other)
		return createEstablishment(t, "My Establishment")
	}

	t.Run("returns my membership", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		expectFields(t, "membership", api.get(t, "/establishments/"+establishmentID+"/members/me").expect(t, http.StatusOK).object(t),
			map[string]any{"userId": mockUser.id, "role": "OWNER", "establishmentId": establishmentID})
	})

	t.Run("lists the members to someone allowed", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		members := api.get(t, "/establishments/"+establishmentID+"/members").expect(t, http.StatusOK).list(t)

		if len(members) != 1 || members[0]["userId"] != mockUser.id {
			t.Errorf("members = %v, want only %s", members, mockUser.id)
		}
	})

	t.Run("refuses the list to someone who does not belong", func(t *testing.T) {
		api := newApp(t)
		setup(t)
		otherID := createEstablishment(t, "Unauthorized Establishment", withoutOwner())

		api.get(t, "/establishments/"+otherID+"/members").expect(t, http.StatusForbidden)
	})

	t.Run("lets an owner invite a member", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/members", map[string]any{"email": other.email, "role": "STAFF"}).
			expect(t, http.StatusCreated)

		if members := queryValue[int](t, `SELECT count(*) FROM "EstablishmentMember" WHERE "establishmentId" = $1 AND "deletedAt" IS NULL`, establishmentID); members != 2 {
			t.Errorf("members = %d, want 2", members)
		}
		role := queryValue[string](t, `SELECT role::text FROM "EstablishmentMember" WHERE "establishmentId" = $1 AND "userId" = $2`, establishmentID, other.id)
		if role != "STAFF" {
			t.Errorf("the invited member is %s, want STAFF", role)
		}
	})

	t.Run("sends the invitation with a link the invite page accepts", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/members", map[string]any{"email": other.email, "role": "STAFF"}).
			expect(t, http.StatusCreated)
		invitation := api.mailbox.waitFor(t, "invite", other.email)

		expectFields(t, "invite", api.get(t, "/auth/invite/"+invitation.Token).expect(t, http.StatusOK).object(t),
			map[string]any{"email": other.email, "hasCredentials": false})
	})

	t.Run("rejects an invalid email", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)

		api.post(t, "/establishments/"+establishmentID+"/members", map[string]any{"email": "not-an-email", "role": "STAFF"}).
			expect(t, http.StatusBadRequest)
	})

	t.Run("removes a member softly", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		api.delete(t, "/establishments/"+establishmentID+"/members/"+memberID).expect(t, http.StatusOK)

		if deleted := queryValue[bool](t, `SELECT "deletedAt" IS NOT NULL FROM "EstablishmentMember" WHERE id = $1`, memberID); !deleted {
			t.Error("the member is not marked as deleted")
		}
	})
}

func TestMemberRoles(t *testing.T) {
	other := user{id: "00000000-0000-4000-8000-0000000000a1", email: "other@establishment.com", name: "Other"}

	setup := func(t *testing.T, myRole domain.EstablishmentRole) string {
		resetWithMockUser(t)
		createUser(t, other)
		return createEstablishment(t, "Establishment", ownedBy(mockUser.id, myRole))
	}

	myMembership := func(t *testing.T, establishmentID string) string {
		return queryValue[string](t, `SELECT id FROM "EstablishmentMember" WHERE "establishmentId" = $1 AND "userId" = $2`, establishmentID, mockUser.id)
	}

	changeRole := func(t *testing.T, api *app, establishmentID, memberID, role string) *response {
		return api.patch(t, "/establishments/"+establishmentID+"/members/"+memberID, map[string]any{"role": role})
	}

	t.Run("lets an owner promote a member to manager", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		changeRole(t, api, establishmentID, memberID, "MANAGER").expect(t, http.StatusOK)

		if role := queryValue[string](t, `SELECT role::text FROM "EstablishmentMember" WHERE id = $1`, memberID); role != "MANAGER" {
			t.Errorf("role = %s, want MANAGER", role)
		}
	})

	t.Run("refuses a manager changing anybody's role", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleManager)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		changeRole(t, api, establishmentID, memberID, "MANAGER").expect(t, http.StatusForbidden)
	})

	t.Run("refuses a staff member changing anybody's role", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleStaff)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		changeRole(t, api, establishmentID, memberID, "OWNER").expect(t, http.StatusForbidden)
	})

	t.Run("refuses leaving the establishment without an owner", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)

		changeRole(t, api, establishmentID, myMembership(t, establishmentID), "STAFF").expect(t, http.StatusBadRequest)
	})

	t.Run("lets an owner step down once there is a second owner", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		addMember(t, establishmentID, other.id, domain.EstablishmentRoleOwner)

		changeRole(t, api, establishmentID, myMembership(t, establishmentID), "STAFF").expect(t, http.StatusOK)
	})

	t.Run("rejects a role that is not an establishment role", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		memberID := addMember(t, establishmentID, other.id, domain.EstablishmentRoleStaff)

		changeRole(t, api, establishmentID, memberID, "ADMIN").expect(t, http.StatusBadRequest)
	})

	t.Run("accepts inviting a manager", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)

		api.post(t, "/establishments/"+establishmentID+"/members", map[string]any{"email": "newcomer@establishment.com", "role": "MANAGER"}).
			expect(t, http.StatusCreated)
		api.mailbox.waitFor(t, "invite", "newcomer@establishment.com")
	})
}

func TestAccessRevocation(t *testing.T) {
	removed := user{id: "00000000-0000-4000-8000-0000000000b1", email: "removed@establishment.com", name: "Removed"}

	setup := func(t *testing.T, myRole domain.EstablishmentRole) string {
		resetWithMockUser(t)
		createUser(t, removed)
		return createEstablishment(t, "Establishment", ownedBy(mockUser.id, myRole))
	}

	invite := func(t *testing.T, api *app, establishmentID, email, role string) *response {
		return api.post(t, "/establishments/"+establishmentID+"/members", map[string]any{"email": email, "role": role})
	}

	membersWith := func(t *testing.T, establishmentID, role string) int {
		return queryValue[int](t, `SELECT count(*) FROM "EstablishmentMember"
			WHERE "establishmentId" = $1 AND role::text = $2 AND "userId" <> $3 AND "deletedAt" IS NULL`, establishmentID, role, mockUser.id)
	}

	t.Run("a removed member loses access to the data they could read", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		memberID := addMember(t, establishmentID, removed.id, domain.EstablishmentRoleStaff)

		api.get(t, "/establishments/"+establishmentID+"/orders", as(removed.id)).expect(t, http.StatusOK)
		api.delete(t, "/establishments/"+establishmentID+"/members/"+memberID).expect(t, http.StatusOK)
		api.get(t, "/establishments/"+establishmentID+"/orders", as(removed.id)).expect(t, http.StatusForbidden)
	})

	t.Run("a removed member stops seeing the establishment in their list", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		memberID := addMember(t, establishmentID, removed.id, domain.EstablishmentRoleStaff)

		api.get(t, "/establishments", as(removed.id)).expect(t, http.StatusOK)
		api.delete(t, "/establishments/"+establishmentID+"/members/"+memberID).expect(t, http.StatusOK)

		if establishments := api.get(t, "/establishments", as(removed.id)).expect(t, http.StatusOK).list(t); len(establishments) != 0 {
			t.Errorf("establishments = %v, want none", establishments)
		}
	})

	t.Run("a removed member gets their access back when invited again", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)
		memberID := addMember(t, establishmentID, removed.id, domain.EstablishmentRoleStaff)
		api.delete(t, "/establishments/"+establishmentID+"/members/"+memberID).expect(t, http.StatusOK)

		invite(t, api, establishmentID, removed.email, "STAFF").expect(t, http.StatusCreated)
		api.mailbox.waitFor(t, "invite", removed.email)

		api.get(t, "/establishments/"+establishmentID+"/orders", as(removed.id)).expect(t, http.StatusOK)
	})

	t.Run("a manager cannot invite an owner", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleManager)

		invite(t, api, establishmentID, "newowner@establishment.com", "OWNER").expect(t, http.StatusForbidden)

		if members := queryValue[int](t, `SELECT count(*) FROM "EstablishmentMember" WHERE "establishmentId" = $1`, establishmentID); members != 1 {
			t.Errorf("members = %d, want 1", members)
		}
	})

	t.Run("a manager can invite staff", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleManager)

		invite(t, api, establishmentID, "newstaff@establishment.com", "STAFF").expect(t, http.StatusCreated)
		api.mailbox.waitFor(t, "invite", "newstaff@establishment.com")

		if staff := membersWith(t, establishmentID, "STAFF"); staff != 1 {
			t.Errorf("new staff = %d, want 1", staff)
		}
	})

	t.Run("an owner can invite an owner", func(t *testing.T) {
		api := newApp(t)
		establishmentID := setup(t, domain.EstablishmentRoleOwner)

		invite(t, api, establishmentID, "newowner@establishment.com", "OWNER").expect(t, http.StatusCreated)
		api.mailbox.waitFor(t, "invite", "newowner@establishment.com")

		if owners := membersWith(t, establishmentID, "OWNER"); owners != 1 {
			t.Errorf("new owners = %d, want 1", owners)
		}
	})
}
