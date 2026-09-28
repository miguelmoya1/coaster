package repository

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// seedMembers leaves e1 with Olga (owner), Marta (manager, signed in with a password),
// Sergio (staff, signed in with Google), Paula (inactive) and Rita (removed), and e2 with
// Olga alone.
func seedMembers(t *testing.T) {
	t.Helper()
	resetDB(t)
	ctx := context.Background()

	for _, user := range [][2]string{{"olga", "Olga"}, {"marta", "Marta"}, {"sergio", "Sergio"}, {"paula", "Paula"}, {"rita", "Rita"}} {
		insertRotaUser(t, user[0], user[1])
	}
	insertRotaEstablishment(t, "e1")
	insertRotaEstablishment(t, "e2")

	insertRotaMember(t, "e1", "olga", "OWNER", true, false)
	insertRotaMember(t, "e1", "marta", "MANAGER", true, false)
	insertRotaMember(t, "e1", "sergio", "STAFF", true, false)
	insertRotaMember(t, "e1", "paula", "STAFF", false, false)
	insertRotaMember(t, "e1", "rita", "STAFF", true, true)
	insertRotaMember(t, "e2", "olga", "OWNER", true, false)

	statements := []string{
		`UPDATE "User" SET "photoUrl" = 'https://example.com/olga.png', "passwordUpdatedAt" = now() WHERE id = 'olga'`,
		`UPDATE "User" SET "passwordUpdatedAt" = now() WHERE id = 'marta'`,
		`INSERT INTO "AuthIdentity" (id, "userId", provider, subject, email, "lastLoginAt") VALUES ('i1', 'sergio', 'GOOGLE', 'g-sergio', 'sergio@example.com', now())`,
	}
	for _, statement := range statements {
		if _, err := testPool.Exec(ctx, statement); err != nil {
			t.Fatalf("%s: %v", statement, err)
		}
	}
}

func TestEstablishmentMemberRepositoryReads(t *testing.T) {
	seedMembers(t)
	ctx := context.Background()
	members := NewEstablishmentMemberRepository(testPool)

	active, err := members.ListActive(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	byID := map[string]domain.EstablishmentMember{}
	for _, member := range active {
		byID[member.ID] = member
	}
	if len(active) != 3 || len(byID) != 3 {
		t.Fatalf("ListActive = %+v", active)
	}

	want := domain.EstablishmentMember{
		ID: "e1/olga", UserID: "olga", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner, Active: true,
		Pending: false, UserName: "Olga", UserImage: "https://example.com/olga.png", UserEmail: "olga@example.com",
	}
	if byID["e1/olga"] != want {
		t.Errorf("olga = %+v\nwant %+v", byID["e1/olga"], want)
	}
	if marta := byID["e1/marta"]; marta.Pending || marta.UserImage != "" || marta.Role != domain.EstablishmentRoleManager {
		t.Errorf("marta = %+v", marta)
	}
	if sergio := byID["e1/sergio"]; sergio.Pending {
		t.Errorf("sergio signed in with Google, pending = %v", sergio.Pending)
	}

	empty, err := members.ListActive(ctx, "nowhere")
	if err != nil || empty == nil || len(empty) != 0 {
		t.Fatalf("ListActive of an empty establishment = %#v, %v", empty, err)
	}

	paula, err := members.FindByUser(ctx, "e1", "paula")
	if err != nil || paula == nil || paula.Active || !paula.Pending || paula.UserName != "Paula" {
		t.Fatalf("FindByUser of an inactive member = %+v, %v", paula, err)
	}
	if rita, err := members.FindByUser(ctx, "e1", "rita"); err != nil || rita != nil {
		t.Fatalf("FindByUser of a removed member = %+v, %v", rita, err)
	}

	invite, err := members.FindInvite(ctx, "e1", "e1/paula")
	wantInvite := domain.MemberInvite{ID: "e1/paula", UserID: "paula", Active: false, UserEmail: "paula@example.com", UserActive: true, Pending: true, EstablishmentName: "Bar e1"}
	if err != nil || invite == nil || *invite != wantInvite {
		t.Fatalf("FindInvite = %+v, %v", invite, err)
	}
	if other, err := members.FindInvite(ctx, "e2", "e1/paula"); err != nil || other != nil {
		t.Fatalf("FindInvite in another establishment = %+v, %v", other, err)
	}
	if removed, err := members.FindInvite(ctx, "e1", "e1/rita"); err != nil || removed != nil {
		t.Fatalf("FindInvite of a removed member = %+v, %v", removed, err)
	}

	for email, want := range map[string]bool{"marta@example.com": true, "paula@example.com": true, "rita@example.com": false, "MARTA@example.com": false} {
		if got, err := members.HasMemberWithEmail(ctx, "e1", email); err != nil || got != want {
			t.Errorf("HasMemberWithEmail(%s) = %v, %v; want %v", email, got, err, want)
		}
	}

	if name, err := members.EstablishmentName(ctx, "e2"); err != nil || name == nil || *name != "Bar e2" {
		t.Errorf("EstablishmentName = %v, %v", name, err)
	}
	if name, err := members.EstablishmentName(ctx, "e9"); err != nil || name != nil {
		t.Errorf("EstablishmentName of nothing = %v, %v", name, err)
	}
}

func TestEstablishmentMemberRepositoryInvite(t *testing.T) {
	seedMembers(t)
	ctx := context.Background()
	members := NewEstablishmentMemberRepository(testPool)
	manager := domain.EstablishmentRoleManager

	invited, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e1", Email: "Ana@Example.com", UserName: "Ana", Role: &manager})
	if err != nil {
		t.Fatal(err)
	}
	if invited.UserEmail != "Ana@Example.com" || invited.UserName != "Ana" || invited.EstablishmentName != "Bar e1" || invited.UserID == "" {
		t.Fatalf("invited = %+v", invited)
	}

	var language, role string
	var deletedAt *time.Time
	err = testPool.QueryRow(ctx, `
		SELECT p.language, m.role::text, m."deletedAt"
		FROM "EstablishmentMember" m JOIN "UserPreferences" p ON p."userId" = m."userId"
		WHERE m.id = $1`, invited.ID).Scan(&language, &role, &deletedAt)
	if err != nil || language != "es" || role != "MANAGER" || deletedAt != nil {
		t.Fatalf("new member: language %q, role %q, deletedAt %v, %v", language, role, deletedAt, err)
	}

	staffless, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e2", Email: "Ana@Example.com", UserName: "Ana"})
	if err != nil || staffless.UserID != invited.UserID {
		t.Fatalf("the same user in another establishment = %+v, %v", staffless, err)
	}
	if err := testPool.QueryRow(ctx, `SELECT role::text FROM "EstablishmentMember" WHERE id = $1`, staffless.ID).Scan(&role); err != nil || role != "STAFF" {
		t.Fatalf("without a role = %q, %v", role, err)
	}

	back, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e1", Email: "rita@example.com", UserName: "rita"})
	if err != nil || back.ID != "e1/rita" || back.UserID != "rita" {
		t.Fatalf("inviting a removed member again = %+v, %v", back, err)
	}

	var name string
	var preferences int
	err = testPool.QueryRow(ctx, `
		SELECT u.name, (SELECT count(*) FROM "UserPreferences" p WHERE p."userId" = u.id), m.role::text, m."deletedAt"
		FROM "EstablishmentMember" m JOIN "User" u ON u.id = m."userId"
		WHERE m.id = 'e1/rita'`).Scan(&name, &preferences, &role, &deletedAt)
	if err != nil || name != "Rita" || preferences != 0 || role != "STAFF" || deletedAt != nil {
		t.Fatalf("rita back: name %q, preferences %d, role %q, deletedAt %v, %v", name, preferences, role, deletedAt, err)
	}

	insertRotaUser(t, "oscar", "Oscar")
	insertRotaMember(t, "e1", "oscar", "OWNER", true, true)
	former, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e1", Email: "oscar@example.com", UserName: "oscar"})
	if err != nil || former.ID != "e1/oscar" {
		t.Fatalf("inviting a removed owner again = %+v, %v", former, err)
	}
	if err := testPool.QueryRow(ctx, `SELECT role::text FROM "EstablishmentMember" WHERE id = 'e1/oscar'`).Scan(&role); err != nil || role != "STAFF" {
		t.Fatalf("a removed owner invited without a role came back as %q, %v", role, err)
	}

	still, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e1", Email: "marta@example.com", UserName: "marta"})
	if err != nil || still.ID != "e1/marta" {
		t.Fatalf("inviting a member who is still there = %+v, %v", still, err)
	}
	if err := testPool.QueryRow(ctx, `SELECT role::text FROM "EstablishmentMember" WHERE id = 'e1/marta'`).Scan(&role); err != nil || role != "MANAGER" {
		t.Fatalf("a member who is still there changed to %q, %v", role, err)
	}

	if _, err := members.Invite(ctx, domain.MemberInvitation{EstablishmentID: "e9", Email: "nadie@example.com", UserName: "nadie"}); err == nil {
		t.Fatal("inviting to an establishment that does not exist worked")
	}
	var users int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM "User" WHERE email = 'nadie@example.com'`).Scan(&users); err != nil || users != 0 {
		t.Fatalf("a failed invitation left %d users, %v", users, err)
	}
}

func TestEstablishmentMemberRepositoryWrites(t *testing.T) {
	seedMembers(t)
	ctx := context.Background()
	members := NewEstablishmentMemberRepository(testPool)

	if updated, err := members.UpdateRole(ctx, "e1", "e1/sergio", domain.EstablishmentRoleManager); err != nil || !updated {
		t.Fatalf("UpdateRole = %v, %v", updated, err)
	}
	if sergio, _ := members.FindByUser(ctx, "e1", "sergio"); sergio.Role != domain.EstablishmentRoleManager {
		t.Fatalf("sergio = %+v", sergio)
	}
	if updated, err := members.UpdateRole(ctx, "e2", "e1/sergio", domain.EstablishmentRoleOwner); err != nil || updated {
		t.Fatalf("UpdateRole in another establishment = %v, %v", updated, err)
	}
	if updated, err := members.UpdateRole(ctx, "e1", "e1/rita", domain.EstablishmentRoleOwner); err != nil || updated {
		t.Fatalf("UpdateRole of a removed member = %v, %v", updated, err)
	}

	if removed, err := members.Remove(ctx, "e1", "e1/sergio"); err != nil || !removed {
		t.Fatalf("Remove = %v, %v", removed, err)
	}
	if sergio, err := members.FindByUser(ctx, "e1", "sergio"); err != nil || sergio != nil {
		t.Fatalf("sergio after Remove = %+v, %v", sergio, err)
	}
	if removed, err := members.Remove(ctx, "e2", "e1/marta"); err != nil || removed {
		t.Fatalf("Remove in another establishment = %v, %v", removed, err)
	}
	if removed, err := members.Remove(ctx, "e1", "missing"); err != nil || removed {
		t.Fatalf("Remove of nobody = %v, %v", removed, err)
	}
}
