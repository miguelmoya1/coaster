package service

import (
	"regexp"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestBillingPriceID(t *testing.T) {
	tests := []struct {
		name     string
		config   BillingConfig
		plan     domain.SubscriptionPlan
		want     string
		wantCode string
	}{
		{name: "PRO", config: testBilling, plan: domain.PlanPro, want: "price_pro_123"},
		{name: "price not configured", config: BillingConfig{}, plan: domain.PlanPro, wantCode: domain.CodeStripePriceNotConfigured},
		{name: "plan outside the catalog", config: testBilling, plan: "YEARLY", wantCode: domain.CodeInvalidSubscriptionPlan},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.config.priceID(tt.plan)
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil || got != tt.want {
				t.Errorf("priceID = %q, %v", got, err)
			}
		})
	}
}

func TestBillingPlanOf(t *testing.T) {
	withLegacy := BillingConfig{PricePro: "price_pro_tax_excluded", PriceProLegacy: "price_pro_123, price_pro_older"}
	emptyLegacy := BillingConfig{PricePro: "price_pro_123", PriceProLegacy: "  ,  "}

	tests := []struct {
		name    string
		config  BillingConfig
		priceID string
		want    domain.SubscriptionPlan
	}{
		{"the PRO price", testBilling, "price_pro_123", domain.PlanPro},
		{"an unknown price", testBilling, "unknown_price", domain.PlanFree},
		{"no price", testBilling, "", domain.PlanFree},
		{"the current price with legacy ones", withLegacy, "price_pro_tax_excluded", domain.PlanPro},
		{"a legacy price", withLegacy, "price_pro_123", domain.PlanPro},
		{"an older legacy price", withLegacy, "price_pro_older", domain.PlanPro},
		{"another product", withLegacy, "price_of_another_product", domain.PlanFree},
		{"an empty legacy list matches nothing", emptyLegacy, "", domain.PlanFree},
		{"an empty legacy list keeps PRO", emptyLegacy, "price_pro_123", domain.PlanPro},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.config.planOf(tt.priceID); got != tt.want {
				t.Errorf("planOf(%q) = %s, want %s", tt.priceID, got, tt.want)
			}
		})
	}
}

func TestStatusFromStripe(t *testing.T) {
	tests := map[string]domain.SubscriptionStatus{
		"trialing":           domain.SubscriptionTrialing,
		"active":             domain.SubscriptionActive,
		"past_due":           domain.SubscriptionPastDue,
		"canceled":           domain.SubscriptionCanceled,
		"unpaid":             domain.SubscriptionUnpaid,
		"incomplete_expired": domain.SubscriptionExpired,
		"incomplete":         domain.SubscriptionInactive,
		"paused":             domain.SubscriptionInactive,
	}

	for stripeStatus, want := range tests {
		if got := statusFromStripe(stripeStatus); got != want {
			t.Errorf("statusFromStripe(%q) = %s, want %s", stripeStatus, got, want)
		}
	}
}

func TestBillingSnapshot(t *testing.T) {
	periodStart, periodEnd := billingDate("2026-01-01T00:00:00Z"), billingDate("2026-02-01T00:00:00Z")
	cancelAt := billingDate("2026-01-20T00:00:00Z")

	item := func(quantity int) []domain.StripeSubscriptionItem {
		return []domain.StripeSubscriptionItem{{ID: "si_1", PriceID: "price_pro_123", Quantity: quantity, CurrentPeriodStart: periodStart, CurrentPeriodEnd: periodEnd}}
	}

	tests := []struct {
		name         string
		subscription domain.StripeSubscription
		wantPlan     domain.SubscriptionPlan
		wantStatus   domain.SubscriptionStatus
		wantSeats    int
		wantID       bool
		wantEnd      *string
		cancellation bool
	}{
		{
			name:         "active: the quantity is the seats billed",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "active", Items: item(12)},
			wantPlan:     domain.PlanPro, wantStatus: domain.SubscriptionActive, wantSeats: 12, wantID: true,
			wantEnd: billingText("2026-02-01T00:00:00Z"),
		},
		{
			name:         "without a quantity it is one seat",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "active", Items: item(0)},
			wantPlan:     domain.PlanPro, wantStatus: domain.SubscriptionActive, wantSeats: 1, wantID: true,
			wantEnd: billingText("2026-02-01T00:00:00Z"),
		},
		{
			name:         "a terminal cancellation falls to FREE and drops the id",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "canceled", Items: item(3)},
			wantPlan:     domain.PlanFree, wantStatus: domain.SubscriptionCanceled, wantSeats: 3, wantID: false,
			wantEnd: billingText("2026-02-01T00:00:00Z"), cancellation: true,
		},
		{
			name:         "a scheduled cancellation keeps the plan and ends at cancel_at",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "active", CancelAt: cancelAt, Items: item(3)},
			wantPlan:     domain.PlanPro, wantStatus: domain.SubscriptionCanceled, wantSeats: 3, wantID: true,
			wantEnd: billingText("2026-01-20T00:00:00Z"), cancellation: true,
		},
		{
			name:         "cancel at period end",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "active", CancelAtPeriodEnd: true, Items: item(3)},
			wantPlan:     domain.PlanPro, wantStatus: domain.SubscriptionCanceled, wantSeats: 3, wantID: true,
			wantEnd: billingText("2026-02-01T00:00:00Z"), cancellation: true,
		},
		{
			name:         "no items",
			subscription: domain.StripeSubscription{ID: "sub_1", Status: "trialing"},
			wantPlan:     domain.PlanFree, wantStatus: domain.SubscriptionTrialing, wantSeats: 1, wantID: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			snapshot := testBilling.snapshot(&tt.subscription)

			if snapshot.Plan != tt.wantPlan || snapshot.Status != tt.wantStatus || snapshot.Billing.Seats != tt.wantSeats {
				t.Errorf("snapshot = %s %s %d seats", snapshot.Plan, snapshot.Status, snapshot.Billing.Seats)
			}
			if (snapshot.StripeSubscriptionID != nil) != tt.wantID {
				t.Errorf("stripeSubscriptionId = %v", snapshot.StripeSubscriptionID)
			}
			if snapshot.IsCancellation != tt.cancellation {
				t.Errorf("isCancellation = %v", snapshot.IsCancellation)
			}

			gotEnd := snapshot.Billing.CurrentPeriodEnd
			switch {
			case tt.wantEnd == nil && gotEnd != nil:
				t.Errorf("currentPeriodEnd = %v, want none", gotEnd)
			case tt.wantEnd != nil && (gotEnd == nil || !gotEnd.Equal(*billingDate(*tt.wantEnd))):
				t.Errorf("currentPeriodEnd = %v, want %s", gotEnd, *tt.wantEnd)
			}
		})
	}
}

func TestIntegrationIdentifier(t *testing.T) {
	shape := regexp.MustCompile(`^coaster_subscription_[a-z]{8}$`)

	same := integrationIdentifier("checkout:establishment-1:PRO:42")
	if same != integrationIdentifier("checkout:establishment-1:PRO:42") {
		t.Errorf("the same seed gave two identifiers")
	}
	if same == integrationIdentifier("checkout:establishment-1:PRO:43") {
		t.Errorf("different seeds gave the same identifier")
	}
	if integrationIdentifier("") == integrationIdentifier("") {
		t.Errorf("without a seed the identifier is not random")
	}
	for _, identifier := range []string{same, integrationIdentifier("seed"), integrationIdentifier("")} {
		if !shape.MatchString(identifier) {
			t.Errorf("identifier %q has the wrong shape", identifier)
		}
	}
}
