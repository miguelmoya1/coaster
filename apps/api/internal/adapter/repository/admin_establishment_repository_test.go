package repository

import (
	"context"
	"reflect"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestAdminEstablishmentRepositoryList(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	establishments := NewAdminEstablishmentRepository(testPool)

	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "luis", "Luis", "luis@cafe.com", "USER", true, daysBefore(30))
	insertAdminUser(t, "gone", "Gone", "gone@old.com", "USER", true, daysBefore(30))

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
	insertAdminEstablishment(t, "stripe-ended", "Stripe ended", daysBefore(3))
	insertAdminSubscription(t, "stripe-ended", "ACTIVE", `"stripeSubscriptionId" = 'sub_1', "currentPeriodEnd" = $2`, daysBefore(1))
	insertAdminEstablishment(t, "trial", "Trial", daysBefore(4))
	insertAdminSubscription(t, "trial", "TRIALING", `"trialEndsAt" = $2`, future)
	insertAdminEstablishment(t, "stripe-live", "Stripe live", daysBefore(5))
	insertAdminSubscription(t, "stripe-live", "ACTIVE", `"stripeSubscriptionId" = 'sub_2', "currentPeriodEnd" = $2`, future)
	insertAdminEstablishment(t, "past-due", "Past due", daysBefore(6))
	insertAdminSubscription(t, "past-due", "PAST_DUE", `"stripeSubscriptionId" = 'sub_3', "currentPeriodEnd" = $2`, future)
	insertAdminEstablishment(t, "stripe-blank", "Stripe blank", daysBefore(7))
	insertAdminSubscription(t, "stripe-blank", "ACTIVE", `"stripeSubscriptionId" = '', "currentPeriodEnd" = $2`, future)

	page := domain.PageRequest{Page: 1, PageSize: 20}
	tests := []struct {
		source domain.EstablishmentBillingSource
		want   []string
	}{
		{domain.BillingSourceManual, []string{"pro-grant"}},
		{domain.BillingSourceStripe, []string{"trial", "stripe-live", "past-due"}},
		{domain.BillingSourceNone, []string{"free-grant", "stripe-ended", "stripe-blank"}},
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
	want := domain.EstablishmentSettings{
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
	if _, err := establishments.UpdateModules(ctx, "missing", nil); err == nil {
		t.Fatal("UpdateModules on a missing establishment must fail")
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
