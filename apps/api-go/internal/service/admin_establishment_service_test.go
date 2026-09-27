package service

import (
	"context"
	"encoding/json"
	"reflect"
	"slices"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

var adminServiceNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

type adminEstablishmentFixture struct {
	repo    *adminEstablishmentFake
	audit   *adminAuditFake
	events  *recordedEvents
	cache   *fakeCache
	service *AdminEstablishmentService
}

func newAdminEstablishmentFixture(rows ...domain.AdminEstablishmentRow) *adminEstablishmentFixture {
	f := &adminEstablishmentFixture{
		repo:   newAdminEstablishmentFake(rows...),
		audit:  &adminAuditFake{},
		events: &recordedEvents{},
		cache:  newFakeCache(),
	}
	f.service = NewAdminEstablishmentService(f.repo, f.audit, f.events, f.cache)
	f.service.now = func() time.Time { return adminServiceNow }
	return f
}

func adminRow(billing *domain.AdminBilling) domain.AdminEstablishmentRow {
	return domain.AdminEstablishmentRow{ID: "e1", Name: "Bar Pepe", CreatedAt: adminServiceNow, Billing: billing}
}

func grantedBilling() *domain.AdminBilling {
	pro := domain.PlanPro
	expires := adminServiceNow.Add(24 * time.Hour)
	grantedBy := "admin"
	return &domain.AdminBilling{
		EstablishmentSubscription: domain.EstablishmentSubscription{
			ID: "sub-1", EstablishmentID: "e1", Plan: domain.PlanFree, Status: domain.SubscriptionInactive,
			ManualPlan: &pro, ManualGrantExpiresAt: &expires, CreatedAt: adminServiceNow, UpdatedAt: adminServiceNow,
		},
		ManualGrantedByID: &grantedBy,
	}
}

func TestAdminEstablishmentServiceList(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(grantedBilling()))

	page, err := f.service.List(context.Background(), domain.AdminEstablishmentFilter{}, domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || page.Total != 1 || len(page.Items) != 1 {
		t.Fatalf("List = %+v, %v", page, err)
	}
	if summary := page.Items[0]; summary.BillingSource != domain.BillingSourceManual || !summary.HasAccess || summary.Plan != domain.PlanPro {
		t.Errorf("summary = %+v", summary)
	}
}

func TestAdminEstablishmentServiceDetail(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(grantedBilling()))
	f.audit.recent = []domain.AdminAuditLogEntry{{ID: "a1"}}

	detail, err := f.service.Detail(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	subscription, ok := detail.Subscription.(domain.AdminEstablishmentSubscription)
	if !ok || subscription.ManualGrant == nil || *subscription.ManualGrant.GrantedByName != "Miguel" {
		t.Fatalf("subscription = %+v", detail.Subscription)
	}
	if !reflect.DeepEqual(detail.Settings, domain.DefaultAdminEstablishmentSettings("e1")) {
		t.Errorf("settings without a row = %+v", detail.Settings)
	}
	if detail.Establishment.ID != "e1" || len(detail.Members) != 1 || detail.Counters.Orders != 5 || len(detail.RecentActivity) != 1 {
		t.Errorf("detail = %+v", detail)
	}
	if !f.repo.since.Equal(adminServiceNow.Add(-30*24*time.Hour)) || !slices.Equal(f.audit.asked, []string{"ESTABLISHMENT:e1"}) {
		t.Errorf("since = %v, asked = %v", f.repo.since, f.audit.asked)
	}

	f.repo.settings["e1"] = domain.AdminEstablishmentSettings{EstablishmentID: "e1", Modules: []domain.EstablishmentModule{domain.ModuleOrders}, Language: "en"}
	detail, _ = f.service.Detail(context.Background(), "e1")
	if !slices.Equal(detail.Settings.Modules, []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory}) || detail.Settings.Language != "en" {
		t.Errorf("stored settings = %+v", detail.Settings)
	}

	if _, err := f.service.Detail(context.Background(), "nope"); !isAdminError(err, domain.KindNotFound, domain.CodeEstablishmentNotFound) {
		t.Fatalf("Detail(nope) = %v", err)
	}
}

func TestAdminEstablishmentServiceDetailWithoutSubscription(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(nil))

	detail, err := f.service.Detail(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	raw, _ := json.Marshal(detail.Subscription)
	want := `{"id":"","establishmentId":"e1","plan":"FREE","status":"INACTIVE","stripeCustomerId":null,"stripeSubscriptionId":null,` +
		`"currentPeriodStart":null,"currentPeriodEnd":null,"trialEndsAt":null,"canceledAt":null,"manualGrant":null,` +
		`"createdAt":"2026-09-27T10:00:00.000Z","updatedAt":"2026-09-27T10:00:00.000Z"}`
	if string(raw) != want {
		t.Errorf("got  %s\nwant %s", raw, want)
	}
}

func TestAdminEstablishmentServiceRename(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(nil))

	if err := f.service.Rename(context.Background(), "admin", "e1", "  Bar Pepe "); err != nil {
		t.Fatal(err)
	}
	if len(f.repo.renamed) != 0 || len(f.events.events) != 0 {
		t.Fatalf("renaming to the same name wrote %v and published %v", f.repo.renamed, f.events.names())
	}

	if err := f.service.Rename(context.Background(), "admin", "e1", " Bar Paco "); err != nil {
		t.Fatal(err)
	}
	entries := adminActionsIn(f.events.events)
	if !slices.Equal(f.repo.renamed, []string{"Bar Paco"}) || len(entries) != 1 {
		t.Fatalf("renamed = %v, events = %v", f.repo.renamed, f.events.names())
	}
	if entry := entries[0]; entry.Action != domain.AuditEstablishmentRenamed || *entry.TargetLabel != "Bar Paco" ||
		entry.Metadata != (adminRenameChange{From: "Bar Pepe", To: "Bar Paco"}) {
		t.Errorf("entry = %+v", entry)
	}

	if err := f.service.Rename(context.Background(), "admin", "nope", "Bar"); !isAdminError(err, domain.KindNotFound, domain.CodeEstablishmentNotFound) {
		t.Fatalf("Rename(nope) = %v", err)
	}
}

func TestAdminEstablishmentServiceUpdateModules(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(nil))
	f.cache.Set(context.Background(), modulesCacheKey("e1"), []string{"TIME_TRACKING"})

	settings, err := f.service.UpdateModules(context.Background(), "admin", "e1", []domain.EstablishmentModule{domain.ModuleOrders})
	if err != nil {
		t.Fatal(err)
	}

	resolved := []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory}
	if !slices.Equal(settings.Modules, resolved) || !slices.Equal(f.repo.modules[0], resolved) {
		t.Errorf("settings = %+v, saved %v", settings, f.repo.modules)
	}
	if !slices.Contains(f.cache.forgotten, "establishment:e1:modules") {
		t.Errorf("forgotten = %v", f.cache.forgotten)
	}

	entries := adminActionsIn(f.events.events)
	if len(entries) != 1 || entries[0].Action != domain.AuditEstablishmentModulesChanged || *entries[0].TargetLabel != "Bar Pepe" {
		t.Fatalf("entries = %+v", entries)
	}
	raw, _ := json.Marshal(entries[0].Metadata)
	if string(raw) != `{"from":null,"to":["TIME_TRACKING","ORDERS","INVENTORY"]}` {
		t.Errorf("metadata = %s", raw)
	}

	// The second time there are settings to compare with.
	if _, err := f.service.UpdateModules(context.Background(), "admin", "e1", nil); err != nil {
		t.Fatal(err)
	}
	raw, _ = json.Marshal(adminActionsIn(f.events.events)[1].Metadata)
	if string(raw) != `{"from":["TIME_TRACKING","ORDERS","INVENTORY"],"to":["TIME_TRACKING"]}` {
		t.Errorf("metadata = %s", raw)
	}

	if _, err := f.service.UpdateModules(context.Background(), "admin", "nope", nil); !isAdminError(err, domain.KindNotFound, domain.CodeEstablishmentNotFound) {
		t.Fatalf("UpdateModules(nope) = %v", err)
	}
}

func TestAdminEstablishmentServiceGrantPlan(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(nil))
	days := 30
	reason := "  Compensation "

	err := f.service.GrantPlan(context.Background(), "admin", "e1", GrantPlanInput{Plan: domain.PlanPro, DurationDays: &days, Reason: &reason})
	if err != nil {
		t.Fatal(err)
	}

	expires := adminServiceNow.Add(30 * 24 * time.Hour)
	if len(f.repo.granted) != 1 {
		t.Fatalf("granted = %+v", f.repo.granted)
	}
	grant := f.repo.granted[0]
	if grant.Plan != domain.PlanPro || !grant.ExpiresAt.Equal(expires) || *grant.Reason != "Compensation" || grant.GrantedByID != "admin" {
		t.Errorf("grant = %+v", grant)
	}

	if names := f.events.names(); !slices.Equal(names, []string{"AdminActionEvent", "SubscriptionOverriddenEvent"}) {
		t.Fatalf("events = %v", names)
	}
	if overridden := f.events.events[1].(domain.SubscriptionOverridden); overridden.EstablishmentID != "e1" {
		t.Errorf("overridden = %+v", overridden)
	}
	entry := adminActionsIn(f.events.events)[0]
	raw, _ := json.Marshal(entry.Metadata)
	if entry.Action != domain.AuditEstablishmentPlanGranted || *entry.Reason != "Compensation" || *entry.TargetLabel != "Bar Pepe" ||
		string(raw) != `{"plan":"PRO","durationDays":30,"expiresAt":"2026-10-27T10:00:00.000Z"}` {
		t.Errorf("entry = %+v, metadata %s", entry, raw)
	}

	openEnded := newAdminEstablishmentFixture(adminRow(nil))
	if err := openEnded.service.GrantPlan(context.Background(), "admin", "e1", GrantPlanInput{Plan: domain.PlanPro}); err != nil {
		t.Fatal(err)
	}
	raw, _ = json.Marshal(adminActionsIn(openEnded.events.events)[0].Metadata)
	if openEnded.repo.granted[0].ExpiresAt != nil || openEnded.repo.granted[0].Reason != nil ||
		string(raw) != `{"plan":"PRO","durationDays":null,"expiresAt":null}` {
		t.Errorf("open-ended grant = %+v, metadata %s", openEnded.repo.granted[0], raw)
	}

	missing := newAdminEstablishmentFixture()
	err = missing.service.GrantPlan(context.Background(), "admin", "e1", GrantPlanInput{Plan: domain.PlanPro})
	if !isAdminError(err, domain.KindNotFound, domain.CodeEstablishmentNotFound) || len(missing.repo.granted) != 0 || len(missing.events.events) != 0 {
		t.Fatalf("GrantPlan(missing) = %v", err)
	}
}

func TestAdminEstablishmentServiceRevokePlan(t *testing.T) {
	f := newAdminEstablishmentFixture(adminRow(grantedBilling()))
	reason := " Ended "

	if err := f.service.RevokePlan(context.Background(), "admin", "e1", &reason); err != nil {
		t.Fatal(err)
	}

	if !slices.Equal(f.repo.revoked, []string{"e1"}) {
		t.Fatalf("revoked = %v", f.repo.revoked)
	}
	if names := f.events.names(); !slices.Equal(names, []string{"AdminActionEvent", "SubscriptionOverriddenEvent"}) {
		t.Fatalf("events = %v", names)
	}
	entry := adminActionsIn(f.events.events)[0]
	raw, _ := json.Marshal(entry.Metadata)
	if entry.Action != domain.AuditEstablishmentPlanRevoked || *entry.Reason != "Ended" ||
		string(raw) != `{"plan":"PRO","expiresAt":"2026-09-28T10:00:00.000Z"}` {
		t.Errorf("entry = %+v, metadata %s", entry, raw)
	}

	for name, billing := range map[string]*domain.AdminBilling{"no subscription row": nil, "no grant": {}} {
		f := newAdminEstablishmentFixture(adminRow(billing))
		err := f.service.RevokePlan(context.Background(), "admin", "e1", nil)
		if !isAdminError(err, domain.KindBadRequest, domain.CodeNoManualGrant) || len(f.repo.revoked) != 0 || len(f.events.events) != 0 {
			t.Errorf("%s: RevokePlan = %v", name, err)
		}
	}

	missing := newAdminEstablishmentFixture()
	if err := missing.service.RevokePlan(context.Background(), "admin", "e1", nil); !isAdminError(err, domain.KindNotFound, domain.CodeEstablishmentNotFound) {
		t.Fatalf("RevokePlan(missing) = %v", err)
	}
}
