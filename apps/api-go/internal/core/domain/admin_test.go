package domain

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"
)

var adminNow = time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

func adminDate(value string) *time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return &parsed
}

func adminText(value string) *string { return &value }

func adminBilling(change func(*AdminBilling)) *AdminBilling {
	billing := &AdminBilling{EstablishmentSubscription: EstablishmentSubscription{
		ID:              "sub-1",
		EstablishmentID: "establishment-1",
		Plan:            PlanFree,
		Status:          SubscriptionInactive,
		CreatedAt:       adminNow,
		UpdatedAt:       adminNow,
	}}
	change(billing)
	return billing
}

func TestAdminEstablishmentRowSummary(t *testing.T) {
	pro := PlanPro
	row := AdminEstablishmentRow{
		ID:          "establishment-1",
		Name:        "El Establishment",
		CreatedAt:   *adminDate("2026-01-01T00:00:00Z"),
		MemberCount: 4,
		OwnerName:   adminText("Ana"),
		OwnerEmail:  adminText("ana@establishment.com"),
	}

	tests := []struct {
		name         string
		billing      *AdminBilling
		plan         SubscriptionPlan
		status       SubscriptionStatus
		source       EstablishmentBillingSource
		accessEndsAt string
		hasAccess    bool
	}{
		{
			name:   "no subscription row",
			plan:   PlanFree,
			status: SubscriptionInactive,
			source: BillingSourceNone,
		},
		{
			name: "a live Stripe subscription",
			billing: adminBilling(func(b *AdminBilling) {
				b.Plan, b.Status = PlanPro, SubscriptionActive
				b.StripeSubscriptionID = adminText("sub_123")
				b.CurrentPeriodEnd = adminDate("2026-04-01T00:00:00Z")
			}),
			plan:         PlanPro,
			status:       SubscriptionActive,
			source:       BillingSourceStripe,
			accessEndsAt: "2026-04-01T00:00:00.000Z",
			hasAccess:    true,
		},
		{
			name: "a live grant wins over Stripe",
			billing: adminBilling(func(b *AdminBilling) {
				b.Plan, b.Status = PlanPro, SubscriptionActive
				b.StripeSubscriptionID = adminText("sub_123")
				b.CurrentPeriodEnd = adminDate("2026-04-01T00:00:00Z")
				b.ManualPlan = &pro
				b.ManualGrantExpiresAt = adminDate("2026-03-15T00:00:00Z")
			}),
			plan:         PlanPro,
			status:       SubscriptionActive,
			source:       BillingSourceManual,
			accessEndsAt: "2026-03-15T00:00:00.000Z",
			hasAccess:    true,
		},
		{
			name: "an open-ended grant",
			billing: adminBilling(func(b *AdminBilling) {
				b.ManualPlan = &pro
			}),
			plan:      PlanPro,
			status:    SubscriptionActive,
			source:    BillingSourceManual,
			hasAccess: true,
		},
		{
			name: "both the grant and the Stripe period have lapsed",
			billing: adminBilling(func(b *AdminBilling) {
				b.Plan, b.Status = PlanPro, SubscriptionActive
				b.StripeSubscriptionID = adminText("sub_123")
				b.CurrentPeriodEnd = adminDate("2026-02-01T00:00:00Z")
				b.ManualPlan = &pro
				b.ManualGrantExpiresAt = adminDate("2026-02-15T00:00:00Z")
			}),
			plan:         PlanPro,
			status:       SubscriptionExpired,
			source:       BillingSourceNone,
			accessEndsAt: "2026-02-01T00:00:00.000Z",
		},
		{
			name: "a running trial",
			billing: adminBilling(func(b *AdminBilling) {
				b.Status = SubscriptionTrialing
				b.TrialEndsAt = adminDate("2026-03-10T00:00:00Z")
			}),
			plan:         PlanFree,
			status:       SubscriptionTrialing,
			source:       BillingSourceStripe,
			accessEndsAt: "2026-03-10T00:00:00.000Z",
			hasAccess:    true,
		},
		{
			name: "past due is access while Stripe retries, as in the route check",
			billing: adminBilling(func(b *AdminBilling) {
				b.Plan, b.Status = PlanPro, SubscriptionPastDue
				b.StripeSubscriptionID = adminText("sub_123")
				b.CurrentPeriodEnd = adminDate("2026-04-01T00:00:00Z")
			}),
			plan:         PlanPro,
			status:       SubscriptionPastDue,
			source:       BillingSourceStripe,
			accessEndsAt: "2026-04-01T00:00:00.000Z",
			hasAccess:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row := row
			row.Billing = tt.billing

			summary := row.Summary(adminNow)

			accessEndsAt := ""
			if summary.AccessEndsAt != nil {
				raw, _ := summary.AccessEndsAt.MarshalJSON()
				accessEndsAt = string(raw[1 : len(raw)-1])
			}
			if summary.Plan != tt.plan || summary.Status != tt.status || summary.BillingSource != tt.source ||
				accessEndsAt != tt.accessEndsAt || summary.HasAccess != tt.hasAccess {
				t.Errorf("summary = %+v, accessEndsAt %q", summary, accessEndsAt)
			}
			if summary.ID != "establishment-1" || summary.MemberCount != 4 || *summary.OwnerName != "Ana" {
				t.Errorf("summary = %+v", summary)
			}
		})
	}
}

func TestAdminBillingAdminView(t *testing.T) {
	pro := PlanPro
	grantedAt := adminDate("2026-02-20T00:00:00Z")
	billing := adminBilling(func(b *AdminBilling) {
		b.ManualPlan = &pro
		b.ManualGrantExpiresAt = adminDate("2026-03-15T00:00:00Z")
		b.ManualGrantReason = adminText("Partner venue")
		b.ManualGrantedByID = adminText("admin-1")
		b.ManualGrantedAt = grantedAt
	})

	view := billing.AdminView(adminText("Miguel"), adminNow)

	raw, err := json.Marshal(view)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"id":"sub-1","establishmentId":"establishment-1","plan":"PRO","status":"ACTIVE","stripeCustomerId":null,` +
		`"stripeSubscriptionId":null,"currentPeriodStart":null,"currentPeriodEnd":null,"trialEndsAt":null,"canceledAt":null,` +
		`"createdAt":"2026-03-01T00:00:00.000Z","updatedAt":"2026-03-01T00:00:00.000Z","manualGrant":{"plan":"PRO",` +
		`"expiresAt":"2026-03-15T00:00:00.000Z","reason":"Partner venue","grantedById":"admin-1","grantedByName":"Miguel",` +
		`"grantedAt":"2026-02-20T00:00:00.000Z"}}`
	if string(raw) != want {
		t.Errorf("got  %s\nwant %s", raw, want)
	}

	billing.ManualGrantedAt = nil
	if got := billing.AdminView(nil, adminNow).ManualGrant.GrantedAt; !got.Equal(adminNow) {
		t.Errorf("grantedAt without manualGrantedAt = %v, want the row's updatedAt", got)
	}

	billing.ManualGrantExpiresAt = adminDate("2026-02-01T00:00:00Z")
	if lapsed := billing.AdminView(nil, adminNow); lapsed.ManualGrant != nil || lapsed.Plan != PlanFree {
		t.Errorf("lapsed grant = %+v", lapsed)
	}
}

func TestNewPageRequest(t *testing.T) {
	number := func(n int) *int { return &n }

	tests := []struct {
		page, pageSize *int
		want           PageRequest
	}{
		{want: PageRequest{Page: 1, PageSize: 20}},
		{page: number(3), pageSize: number(50), want: PageRequest{Page: 3, PageSize: 50}},
		{page: number(0), pageSize: number(500), want: PageRequest{Page: 1, PageSize: 100}},
		{pageSize: number(0), want: PageRequest{Page: 1, PageSize: 1}},
	}

	for _, tt := range tests {
		if got := NewPageRequest(tt.page, tt.pageSize); got != tt.want {
			t.Errorf("NewPageRequest = %+v, want %+v", got, tt.want)
		}
	}

	if offset := (PageRequest{Page: 3, PageSize: 20}).Offset(); offset != 40 {
		t.Errorf("Offset = %d", offset)
	}

	raw, _ := json.Marshal(NewPage[string](nil, 0, PageRequest{Page: 1, PageSize: 20}))
	if string(raw) != `{"items":[],"total":0,"page":1,"pageSize":20}` {
		t.Errorf("empty page = %s", raw)
	}
}

func TestAdminEstablishmentSettingsResolved(t *testing.T) {
	stored := AdminEstablishmentSettings{EstablishmentID: "e1", Modules: []EstablishmentModule{ModuleOrders}, Language: "fr"}

	want := AdminEstablishmentSettings{
		EstablishmentID: "e1",
		Modules:         []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory},
		Language:        "es",
	}
	if got := stored.Resolved(); !reflect.DeepEqual(got, want) {
		t.Errorf("Resolved = %+v", got)
	}

	if got := DefaultAdminEstablishmentSettings("e1"); !reflect.DeepEqual(got, want) {
		t.Errorf("default = %+v", got)
	}
}

func TestAdminBetaTestersJSON(t *testing.T) {
	page := AdminBetaTesters{
		Paginated: NewPage([]BetaTester{{ID: "b1", Email: "a@b.com", CreatedAt: NewTime(adminNow)}}, 1, PageRequest{Page: 1, PageSize: 20}),
		Enforcing: true,
	}

	raw, _ := json.Marshal(page)
	want := `{"items":[{"id":"b1","email":"a@b.com","note":null,"createdAt":"2026-03-01T00:00:00.000Z","invitedByName":null,` +
		`"userId":null,"signedUpAt":null}],"total":1,"page":1,"pageSize":20,"enforcing":true}`
	if string(raw) != want {
		t.Errorf("got  %s\nwant %s", raw, want)
	}
}

func TestSubscriptionCounts(t *testing.T) {
	var statuses SubscriptionStatusCounts
	statuses.Set(SubscriptionTrialing, 3)
	statuses.Set(SubscriptionExpired, 1)

	var plans SubscriptionPlanCounts
	plans.Set(PlanPro, 2)

	raw, _ := json.Marshal(AdminSubscriptionMetrics{ByStatus: statuses, ByPlan: plans})
	want := `{"withAccess":0,"stripe":0,"manual":0,"byStatus":{"INACTIVE":0,"TRIALING":3,"ACTIVE":0,"PAST_DUE":0,` +
		`"CANCELED":0,"UNPAID":0,"EXPIRED":1},"byPlan":{"FREE":0,"PRO":2}}`
	if string(raw) != want {
		t.Errorf("got  %s\nwant %s", raw, want)
	}
}
