package repository

import (
	"context"
	"reflect"
	"slices"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// Rows the backoffice tests start from, written straight with SQL.

func adminExec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := testPool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func insertAdminUser(t *testing.T, id, name, email, role string, active bool, createdAt time.Time) {
	t.Helper()
	adminExec(t, `INSERT INTO "User" (id, email, name, role, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::"Role", $5, $6, $6)`,
		id, email, name, role, active, createdAt)
}

func insertAdminEstablishment(t *testing.T, id, name string, createdAt time.Time) {
	t.Helper()
	adminExec(t, `INSERT INTO "Establishment" (id, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $3)`, id, name, createdAt)
}

func insertAdminMember(t *testing.T, id, establishmentID, userID, role string, active, removed bool, createdAt time.Time) {
	t.Helper()
	adminExec(t, `
		INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "createdAt", "updatedAt", "deletedAt")
		VALUES ($1, $2, $3, $4::"EstablishmentRole", $5, $6::timestamp(3), $6, CASE WHEN $7 THEN $6 END)`,
		id, userID, establishmentID, role, active, createdAt, removed)
}

// insertAdminSubscription writes a subscription row; set fills the columns the test cares about.
func insertAdminSubscription(t *testing.T, establishmentID, status string, set string, args ...any) {
	t.Helper()
	adminExec(t, `INSERT INTO "EstablishmentSubscription" (id, "establishmentId", status, "updatedAt") VALUES ('sub-' || $1::text, $1, $2::"SubscriptionStatus", now())`,
		establishmentID, status)
	if set != "" {
		adminExec(t, `UPDATE "EstablishmentSubscription" SET `+set+` WHERE "establishmentId" = $1`, append([]any{establishmentID}, args...)...)
	}
}

var adminTestNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

func daysBefore(days int) time.Time {
	return adminTestNow.Add(-time.Duration(days) * 24 * time.Hour)
}

func TestAdminAuditRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	audit := NewAdminAuditRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)

	label := "Bar Pepe"
	type renamed struct {
		From string `json:"from"`
		To   string `json:"to"`
	}
	entries := []domain.AdminAuditEntry{
		{ActorID: "admin", Action: domain.AuditEstablishmentRenamed, TargetType: domain.AuditTargetEstablishment, TargetID: "e1",
			TargetLabel: &label, Metadata: renamed{From: "Bar", To: "Bar Pepe"}},
		{ActorID: "admin", Action: domain.AuditBetaTesterAdded, TargetType: domain.AuditTargetBetaTester, TargetID: "b1"},
		{ActorID: "admin", Action: domain.AuditEstablishmentPlanGranted, TargetType: domain.AuditTargetEstablishment, TargetID: "e1"},
	}
	for _, entry := range entries {
		if err := audit.Record(ctx, entry); err != nil {
			t.Fatalf("Record: %v", err)
		}
		time.Sleep(5 * time.Millisecond)
	}

	all, total, err := audit.List(ctx, domain.AdminAuditFilter{}, domain.PageRequest{Page: 1, PageSize: 2})
	if err != nil || total != 3 || len(all) != 2 {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}
	if all[0].Action != domain.AuditEstablishmentPlanGranted || all[1].Action != domain.AuditBetaTesterAdded {
		t.Errorf("List is not newest first: %s, %s", all[0].Action, all[1].Action)
	}
	if all[0].ActorName != "Miguel" || all[0].ActorEmail != "miguel@example.com" || all[0].Metadata != nil || all[0].TargetLabel != nil {
		t.Errorf("entry = %+v", all[0])
	}

	lastPage, total, err := audit.List(ctx, domain.AdminAuditFilter{}, domain.PageRequest{Page: 2, PageSize: 2})
	if err != nil || total != 3 || len(lastPage) != 1 || lastPage[0].Action != domain.AuditEstablishmentRenamed {
		t.Fatalf("List page 2 = %+v, %d, %v", lastPage, total, err)
	}
	if string(lastPage[0].Metadata) != `{"to": "Bar Pepe", "from": "Bar"}` || *lastPage[0].TargetLabel != label {
		t.Errorf("metadata = %s", lastPage[0].Metadata)
	}

	filtered, total, err := audit.List(ctx, domain.AdminAuditFilter{TargetType: domain.AuditTargetEstablishment, TargetID: "e1", Action: domain.AuditEstablishmentRenamed},
		domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || total != 1 || len(filtered) != 1 {
		t.Fatalf("List filtered = %+v, %d, %v", filtered, total, err)
	}

	recent, err := audit.RecentFor(ctx, domain.AuditTargetEstablishment, "e1", 1)
	if err != nil || len(recent) != 1 || recent[0].Action != domain.AuditEstablishmentPlanGranted {
		t.Fatalf("RecentFor = %+v, %v", recent, err)
	}

	none, err := audit.RecentFor(ctx, domain.AuditTargetUser, "e1", 10)
	if err != nil || none == nil || len(none) != 0 {
		t.Fatalf("RecentFor nobody = %#v, %v", none, err)
	}
}

func TestBetaTesterRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	testers := NewBetaTesterRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)
	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, adminTestNow)

	note := "Bar Pepe"
	pepe, err := testers.Add(ctx, "ana@bar.com", &note, "admin")
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	time.Sleep(5 * time.Millisecond)
	luna, err := testers.Add(ctx, "luna@cafe.com", nil, "admin")
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	found, err := testers.FindByEmail(ctx, "ana@bar.com")
	if err != nil || found == nil || found.ID != pepe || *found.Note != note || *found.InvitedByName != "Miguel" {
		t.Fatalf("FindByEmail = %+v, %v", found, err)
	}
	if missing, err := testers.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID(nope) = %+v, %v", missing, err)
	}

	all, total, err := testers.List(ctx, "", domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || total != 2 || len(all) != 2 || all[0].ID != luna || all[1].ID != pepe {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}

	for _, search := range []string{"PEPE", "Ana@"} {
		byNote, total, err := testers.List(ctx, search, domain.PageRequest{Page: 1, PageSize: 20})
		if err != nil || total != 1 || len(byNote) != 1 || byNote[0].ID != pepe {
			t.Fatalf("List(%q) = %+v, %d, %v", search, byNote, total, err)
		}
	}

	signUps, err := testers.FindSignUps(ctx, []string{"ana@bar.com", "luna@cafe.com"})
	if err != nil || len(signUps) != 1 || signUps[0].UserID != "ana" || signUps[0].Email != "ana@bar.com" {
		t.Fatalf("FindSignUps = %+v, %v", signUps, err)
	}

	if err := testers.Remove(ctx, pepe); err != nil {
		t.Fatal(err)
	}
	if gone, _ := testers.FindByID(ctx, pepe); gone != nil {
		t.Fatal("the tester is still there")
	}

	// The inviter's account going away leaves the tester without an inviter.
	adminExec(t, `DELETE FROM "User" WHERE id = 'admin'`)
	orphan, err := testers.FindByID(ctx, luna)
	if err != nil || orphan == nil || orphan.InvitedByName != nil {
		t.Fatalf("FindByID after the inviter left = %+v, %v", orphan, err)
	}
}

func TestAdminUserRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewAdminUserRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, daysBefore(3))
	insertAdminUser(t, "old-admin", "Olga", "olga@example.com", "ADMIN", false, daysBefore(2))
	insertAdminUser(t, "ana", "Ana García", "ana@bar.com", "USER", true, daysBefore(1))
	adminExec(t, `INSERT INTO "UserPreferences" (id, "userId", language, "updatedAt") VALUES ('p1', 'ana', 'en', now())`)

	insertAdminEstablishment(t, "e1", "Bar Pepe", daysBefore(10))
	insertAdminEstablishment(t, "e2", "Café Luna", daysBefore(10))
	insertAdminEstablishment(t, "e3", "Old bar", daysBefore(10))
	insertAdminMember(t, "m1", "e1", "ana", "OWNER", true, false, daysBefore(5))
	insertAdminMember(t, "m2", "e2", "ana", "STAFF", false, false, daysBefore(4))
	insertAdminMember(t, "m3", "e3", "ana", "STAFF", true, true, daysBefore(3))

	page := domain.PageRequest{Page: 1, PageSize: 20}

	all, total, err := users.List(ctx, domain.AdminUserFilter{}, page)
	if err != nil || total != 3 || len(all) != 3 || all[0].ID != "ana" || all[2].ID != "admin" {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}
	ana := all[0]
	if ana.Language != "en" || ana.EstablishmentCount != 1 || ana.Role != domain.RoleUser || ana.PhotoURL != nil {
		t.Errorf("ana = %+v", ana)
	}
	if all[2].Language != domain.DefaultLanguage || all[2].EstablishmentCount != 0 {
		t.Errorf("admin = %+v", all[2])
	}

	active := true
	inactive := false
	tests := []struct {
		name   string
		filter domain.AdminUserFilter
		want   []string
	}{
		{"by id", domain.AdminUserFilter{Search: "old-admin"}, []string{"old-admin"}},
		{"by part of the name", domain.AdminUserFilter{Search: "garcía"}, []string{"ana"}},
		{"by part of the email", domain.AdminUserFilter{Search: "EXAMPLE.COM"}, []string{"old-admin", "admin"}},
		{"by role", domain.AdminUserFilter{Role: domain.RoleAdmin}, []string{"old-admin", "admin"}},
		{"active admins", domain.AdminUserFilter{Role: domain.RoleAdmin, Active: &active}, []string{"admin"}},
		{"inactive", domain.AdminUserFilter{Active: &inactive}, []string{"old-admin"}},
	}
	for _, tt := range tests {
		found, total, err := users.List(ctx, tt.filter, page)
		var ids []string
		for _, user := range found {
			ids = append(ids, user.ID)
		}
		if err != nil || total != len(tt.want) || !slices.Equal(ids, tt.want) {
			t.Errorf("%s: List = %v, %d, %v", tt.name, ids, total, err)
		}
	}

	found, err := users.FindByID(ctx, "ana")
	if err != nil || found == nil || !reflect.DeepEqual(*found, ana) {
		t.Fatalf("FindByID = %+v, %v", found, err)
	}
	if missing, err := users.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID(nope) = %+v, %v", missing, err)
	}

	memberships, err := users.Memberships(ctx, "ana")
	if err != nil || len(memberships) != 2 {
		t.Fatalf("Memberships = %+v, %v", memberships, err)
	}
	if memberships[0].EstablishmentID != "e2" || memberships[0].EstablishmentName != "Café Luna" || memberships[0].Active ||
		memberships[1].EstablishmentID != "e1" || memberships[1].Role != domain.EstablishmentRoleOwner {
		t.Errorf("memberships = %+v", memberships)
	}

	if admins, err := users.CountActiveAdmins(ctx); err != nil || admins != 1 {
		t.Fatalf("CountActiveAdmins = %d, %v", admins, err)
	}

	admin := domain.RoleAdmin
	if err := users.Update(ctx, "ana", domain.AdminUserChanges{Role: &admin}); err != nil {
		t.Fatal(err)
	}
	if updated, _ := users.FindByID(ctx, "ana"); updated.Role != domain.RoleAdmin || !updated.Active {
		t.Errorf("after promoting = %+v", updated)
	}
	if err := users.Update(ctx, "ana", domain.AdminUserChanges{Active: &inactive}); err != nil {
		t.Fatal(err)
	}
	if updated, _ := users.FindByID(ctx, "ana"); updated.Role != domain.RoleAdmin || updated.Active {
		t.Errorf("after deactivating = %+v", updated)
	}
}

func TestAdminEstablishmentRepositoryList(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "luis", "Luis", "luis@cafe.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "gone", "Gone", "gone@old.com", "USER", true, daysBefore(30))

	// manual: an open-ended grant on top of Stripe; stripe: only Stripe; lapsed: a grant that
	// ended; none: no subscription row at all.
	insertAdminEstablishment(t, "manual", "Bar Pepe", daysBefore(4))
	insertAdminEstablishment(t, "stripe", "Café Luna", daysBefore(3))
	insertAdminEstablishment(t, "lapsed", "Old bar", daysBefore(2))
	insertAdminEstablishment(t, "none", "Nothing", daysBefore(1))

	insertAdminSubscription(t, "manual", "ACTIVE", `"manualPlan" = 'PRO', "stripeSubscriptionId" = 'sub_manual'`)
	insertAdminSubscription(t, "stripe", "ACTIVE", `"stripeSubscriptionId" = 'sub_1', "currentPeriodEnd" = $2`, adminTestNow.Add(24*time.Hour))
	insertAdminSubscription(t, "lapsed", "TRIALING", `"manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, daysBefore(1))

	insertAdminMember(t, "m1", "manual", "gone", "OWNER", true, true, daysBefore(10))
	insertAdminMember(t, "m2", "manual", "luis", "OWNER", false, false, daysBefore(9))
	insertAdminMember(t, "m3", "manual", "ana", "OWNER", true, false, daysBefore(8))
	insertAdminMember(t, "m4", "stripe", "luis", "OWNER", true, false, daysBefore(8))

	page := domain.PageRequest{Page: 1, PageSize: 20}

	all, total, err := establishments.List(ctx, domain.AdminEstablishmentFilter{}, page, adminTestNow)
	if err != nil || total != 4 || len(all) != 4 {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}
	if all[0].ID != "none" || all[3].ID != "manual" {
		t.Errorf("List is not newest first: %s … %s", all[0].ID, all[3].ID)
	}
	if all[0].Billing != nil || all[0].MemberCount != 0 || all[0].OwnerName != nil {
		t.Errorf("none = %+v", all[0])
	}

	manual := all[3]
	if manual.MemberCount != 1 || *manual.OwnerName != "Ana" || *manual.OwnerEmail != "ana@bar.com" {
		t.Errorf("manual = %+v", manual)
	}
	billing := manual.Billing
	if billing == nil || billing.ID != "sub-manual" || billing.EstablishmentID != "manual" || *billing.ManualPlan != domain.PlanPro ||
		billing.Plan != domain.PlanFree || billing.Status != domain.SubscriptionActive || billing.Seats != 1 {
		t.Errorf("manual billing = %+v", billing)
	}

	tests := []struct {
		name   string
		filter domain.AdminEstablishmentFilter
		want   []string
	}{
		{"by id", domain.AdminEstablishmentFilter{Search: "stripe"}, []string{"stripe"}},
		{"by part of the name", domain.AdminEstablishmentFilter{Search: "LUNA"}, []string{"stripe"}},
		{"not by the email of a removed member", domain.AdminEstablishmentFilter{Search: "old.com"}, nil},
		{"by the email of a member, inactive ones too", domain.AdminEstablishmentFilter{Search: "cafe.com"}, []string{"stripe", "manual"}},
		{"by status", domain.AdminEstablishmentFilter{Status: domain.SubscriptionActive}, []string{"stripe", "manual"}},
		{"a live manual grant", domain.AdminEstablishmentFilter{BillingSource: domain.BillingSourceManual}, []string{"manual"}},
		{"linked to Stripe without a live grant", domain.AdminEstablishmentFilter{BillingSource: domain.BillingSourceStripe}, []string{"stripe"}},
		{"neither", domain.AdminEstablishmentFilter{BillingSource: domain.BillingSourceNone}, []string{"none", "lapsed"}},
		{"neither, trialing", domain.AdminEstablishmentFilter{BillingSource: domain.BillingSourceNone, Status: domain.SubscriptionTrialing}, []string{"lapsed"}},
	}
	for _, tt := range tests {
		found, total, err := establishments.List(ctx, tt.filter, page, adminTestNow)
		var ids []string
		for _, establishment := range found {
			ids = append(ids, establishment.ID)
		}
		if err != nil || total != len(tt.want) || !slices.Equal(ids, tt.want) {
			t.Errorf("%s: List = %v, %d, %v", tt.name, ids, total, err)
		}
	}

	second, total, err := establishments.List(ctx, domain.AdminEstablishmentFilter{}, domain.PageRequest{Page: 2, PageSize: 3}, adminTestNow)
	if err != nil || total != 4 || len(second) != 1 || second[0].ID != "manual" {
		t.Fatalf("List page 2 = %+v, %d, %v", second, total, err)
	}

	found, err := establishments.FindByID(ctx, "manual")
	if err != nil || found == nil || !reflect.DeepEqual(*found, manual) {
		t.Fatalf("FindByID = %+v, %v", found, err)
	}
	if missing, err := establishments.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID(nope) = %+v, %v", missing, err)
	}
}

func TestAdminEstablishmentRepositoryBillingSource(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	future := adminTestNow.Add(24 * time.Hour)
	insertAdminEstablishment(t, "free-grant", "Free grant", daysBefore(1))
	insertAdminSubscription(t, "free-grant", "INACTIVE", `"manualPlan" = 'FREE'`)
	insertAdminEstablishment(t, "pro-grant", "Pro grant", daysBefore(2))
	insertAdminSubscription(t, "pro-grant", "INACTIVE", `"manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, future)

	page := domain.PageRequest{Page: 1, PageSize: 20}
	tests := []struct {
		source domain.EstablishmentBillingSource
		want   []string
	}{
		{domain.BillingSourceManual, []string{"pro-grant"}},
		{domain.BillingSourceNone, []string{"free-grant"}},
	}
	for _, tt := range tests {
		found, total, err := establishments.List(ctx, domain.AdminEstablishmentFilter{BillingSource: tt.source}, page, adminTestNow)
		var ids []string
		for _, establishment := range found {
			ids = append(ids, establishment.ID)
			if establishment.Summary(adminTestNow).BillingSource != tt.source {
				t.Errorf("%s: %s shows %s", tt.source, establishment.ID, establishment.Summary(adminTestNow).BillingSource)
			}
		}
		if err != nil || total != len(tt.want) || !slices.Equal(ids, tt.want) {
			t.Errorf("%s: List = %v, %d, %v", tt.source, ids, total, err)
		}
	}
}

func TestAdminEstablishmentRepositoryDetail(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "luis", "Luis", "luis@bar.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "marta", "Marta", "marta@bar.com", "USER", true, daysBefore(30))
	insertAdminEstablishment(t, "e1", "Bar Pepe", daysBefore(30))
	insertAdminEstablishment(t, "e2", "Other", daysBefore(30))

	insertAdminMember(t, "m-staff", "e1", "luis", "STAFF", true, false, daysBefore(20))
	insertAdminMember(t, "m-owner", "e1", "ana", "OWNER", true, false, daysBefore(10))
	insertAdminMember(t, "m-gone", "e1", "marta", "MANAGER", true, true, daysBefore(5))

	members, err := establishments.Members(ctx, "e1")
	if err != nil || len(members) != 2 || members[0].ID != "m-owner" || members[1].ID != "m-staff" {
		t.Fatalf("Members = %+v, %v", members, err)
	}
	if members[0].UserID != "ana" || members[0].Email != "ana@bar.com" || members[0].Role != domain.EstablishmentRoleOwner || !members[0].Active {
		t.Errorf("owner = %+v", members[0])
	}

	adminExec(t, `INSERT INTO "Category" (id, "establishmentId", name) VALUES ('c1', 'e1', 'Drinks'), ('c2', 'e1', 'Gone'), ('c3', 'e2', 'Other')`)
	adminExec(t, `UPDATE "Category" SET "deletedAt" = now() WHERE id = 'c2'`)
	adminExec(t, `INSERT INTO "Product" (id, name, "categoryId", "updatedAt", "deletedAt") VALUES
		('p1', 'Beer', 'c1', now(), NULL), ('p2', 'Old beer', 'c1', now(), now()), ('p3', 'Wine', 'c2', now(), NULL), ('p4', 'Other', 'c3', now(), NULL)`)
	adminExec(t, `INSERT INTO "Table" (id, name, "establishmentId", "updatedAt") VALUES ('t1', 'T1', 'e1', now()), ('t2', 'T2', 'e2', now())`)
	adminExec(t, `INSERT INTO "Order" (id, "establishmentId", status, "totalAmount", "createdAt", "updatedAt") VALUES
		('o1', 'e1', 'CLOSED', 1000, $1, now()),
		('o2', 'e1', 'CLOSED', 250, $2, now()),
		('o3', 'e1', 'OPEN', 999, $1, now()),
		('o4', 'e1', 'CLOSED', 5000, $3, now()),
		('o5', 'e2', 'CLOSED', 7000, $1, now())`,
		daysBefore(1), daysBefore(29), daysBefore(31))

	counters, err := establishments.Counters(ctx, "e1", daysBefore(30))
	want := domain.AdminEstablishmentCounters{Categories: 1, Products: 2, Tables: 1, Orders: 4, OrdersLast30Days: 3, RevenueLast30Days: 1250}
	if err != nil || counters != want {
		t.Fatalf("Counters = %+v, %v", counters, err)
	}

	empty, err := establishments.Counters(ctx, "nope", daysBefore(30))
	if err != nil || empty != (domain.AdminEstablishmentCounters{}) {
		t.Fatalf("Counters of nothing = %+v, %v", empty, err)
	}

	if name, err := establishments.UserName(ctx, "ana"); err != nil || name == nil || *name != "Ana" {
		t.Fatalf("UserName = %v, %v", name, err)
	}
	if name, err := establishments.UserName(ctx, "nope"); err != nil || name != nil {
		t.Fatalf("UserName(nope) = %v, %v", name, err)
	}

	if err := establishments.Rename(ctx, "e1", "Bar Paco"); err != nil {
		t.Fatal(err)
	}
	if renamed, _ := establishments.FindByID(ctx, "e1"); renamed.Name != "Bar Paco" {
		t.Errorf("after renaming = %+v", renamed)
	}
}

func TestAdminEstablishmentRepositorySettings(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	insertAdminEstablishment(t, "e1", "Bar Pepe", adminTestNow)
	insertAdminEstablishment(t, "e2", "Café Luna", adminTestNow)
	adminExec(t, `INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, language, "markSoldOut", "configuredAt", "updatedAt")
		VALUES ('s2', 'e2', '{TIME_TRACKING}', 'en', true, $1, now())`, adminTestNow)

	if missing, err := establishments.Settings(ctx, "e1"); err != nil || missing != nil {
		t.Fatalf("Settings without a row = %+v, %v", missing, err)
	}

	created, err := establishments.UpdateModules(ctx, "e1", []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory})
	want := domain.AdminEstablishmentSettings{
		EstablishmentID: "e1",
		Modules:         []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory},
		Language:        "es",
	}
	if err != nil || !reflect.DeepEqual(created, want) {
		t.Fatalf("UpdateModules creating = %+v, %v", created, err)
	}

	updated, err := establishments.UpdateModules(ctx, "e2", []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleInventory})
	if err != nil || updated.Language != "en" || !updated.MarkSoldOut || updated.ConfiguredAt == nil ||
		!slices.Equal(updated.Modules, []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleInventory}) {
		t.Fatalf("UpdateModules updating = %+v, %v", updated, err)
	}

	stored, err := establishments.Settings(ctx, "e2")
	if err != nil || stored == nil || !reflect.DeepEqual(*stored, updated) {
		t.Fatalf("Settings = %+v, %v", stored, err)
	}
}

func TestAdminEstablishmentRepositoryPlans(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)
	insertAdminEstablishment(t, "stripe", "Café Luna", adminTestNow)
	insertAdminEstablishment(t, "bare", "No row", adminTestNow)
	insertAdminSubscription(t, "stripe", "ACTIVE", `"stripeCustomerId" = 'cus_keep', "stripeSubscriptionId" = 'sub_keep', plan = 'PRO'`)

	reason := "Compensation"
	expires := adminTestNow.Add(30 * 24 * time.Hour)
	if err := establishments.GrantPlan(ctx, "stripe", domain.ManualPlanGrant{Plan: domain.PlanPro, ExpiresAt: &expires, Reason: &reason, GrantedByID: "admin"}); err != nil {
		t.Fatalf("GrantPlan: %v", err)
	}

	granted, _ := establishments.FindByID(ctx, "stripe")
	billing := granted.Billing
	if *billing.StripeCustomerID != "cus_keep" || *billing.StripeSubscriptionID != "sub_keep" || billing.Plan != domain.PlanPro ||
		*billing.ManualPlan != domain.PlanPro || !billing.ManualGrantExpiresAt.Equal(expires) || *billing.ManualGrantReason != reason ||
		*billing.ManualGrantedByID != "admin" || billing.ManualGrantedAt == nil {
		t.Errorf("after granting = %+v", billing)
	}

	if err := establishments.GrantPlan(ctx, "bare", domain.ManualPlanGrant{Plan: domain.PlanPro, GrantedByID: "admin"}); err != nil {
		t.Fatalf("GrantPlan without a row: %v", err)
	}
	created, _ := establishments.FindByID(ctx, "bare")
	if created.Billing == nil || created.Billing.Plan != domain.PlanFree || created.Billing.Status != domain.SubscriptionInactive ||
		*created.Billing.ManualPlan != domain.PlanPro || created.Billing.ManualGrantExpiresAt != nil || created.Billing.ManualGrantReason != nil {
		t.Errorf("after granting without a row = %+v", created.Billing)
	}

	if err := establishments.RevokePlan(ctx, "stripe"); err != nil {
		t.Fatalf("RevokePlan: %v", err)
	}
	revoked, _ := establishments.FindByID(ctx, "stripe")
	billing = revoked.Billing
	if billing.ManualPlan != nil || billing.ManualGrantExpiresAt != nil || billing.ManualGrantReason != nil ||
		billing.ManualGrantedByID != nil || billing.ManualGrantedAt != nil || *billing.StripeSubscriptionID != "sub_keep" {
		t.Errorf("after revoking = %+v", billing)
	}
}

func TestAdminMetricsRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	metrics := NewAdminMetricsRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, daysBefore(60))
	insertAdminUser(t, "old-admin", "Olga", "olga@example.com", "ADMIN", false, daysBefore(40))
	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, daysBefore(10))

	insertAdminEstablishment(t, "manual", "Manual", daysBefore(3))
	insertAdminEstablishment(t, "stripe", "Stripe", daysBefore(10))
	insertAdminEstablishment(t, "both", "Both", daysBefore(40))
	insertAdminEstablishment(t, "trial", "Trial", daysBefore(40))
	insertAdminEstablishment(t, "lapsed", "Lapsed", daysBefore(40))
	insertAdminEstablishment(t, "free", "Free", daysBefore(40))

	future := adminTestNow.Add(24 * time.Hour)
	insertAdminSubscription(t, "manual", "INACTIVE", `"manualPlan" = 'PRO'`)
	insertAdminSubscription(t, "stripe", "ACTIVE", `plan = 'PRO', "stripeSubscriptionId" = 'sub_1', "currentPeriodEnd" = $2`, future)
	insertAdminSubscription(t, "both", "CANCELED", `plan = 'PRO', "currentPeriodEnd" = $2, "manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, future)
	insertAdminSubscription(t, "trial", "TRIALING", `"trialEndsAt" = $2`, future)
	insertAdminSubscription(t, "free", "INACTIVE", `"manualPlan" = 'FREE'`)
	insertAdminSubscription(t, "lapsed", "ACTIVE", `"stripeSubscriptionId" = 'sub_2', "currentPeriodEnd" = $2, "manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, daysBefore(1))

	adminExec(t, `INSERT INTO "Order" (id, "establishmentId", status, "totalAmount", "createdAt", "updatedAt") VALUES
		('o1', 'stripe', 'CLOSED', 1000, $1, now()),
		('o2', 'manual', 'CANCELLED', 999, $1, now()),
		('o3', 'manual', 'CLOSED', 500, $2, now())`,
		daysBefore(1), daysBefore(31))

	got, err := metrics.Collect(ctx, adminTestNow, daysBefore(7), daysBefore(30))
	if err != nil {
		t.Fatal(err)
	}

	want := domain.AdminPlatformMetrics{
		Establishments: domain.AdminEstablishmentMetrics{Total: 6, CreatedLast7Days: 1, CreatedLast30Days: 2},
		Users:          domain.AdminUserMetrics{Total: 3, Active: 2, Admins: 2, CreatedLast30Days: 1},
		Subscriptions: domain.AdminSubscriptionMetrics{
			WithAccess: 4,
			Stripe:     2,
			Manual:     2,
			ByStatus:   domain.SubscriptionStatusCounts{Inactive: 2, Trialing: 1, Active: 2, Canceled: 1},
			ByPlan:     domain.SubscriptionPlanCounts{Free: 4, Pro: 2},
		},
		Activity: domain.AdminActivityMetrics{OrdersLast30Days: 2, RevenueLast30Days: 1000},
	}
	if got != want {
		t.Errorf("Collect =\n%+v\nwant\n%+v", got, want)
	}
}
