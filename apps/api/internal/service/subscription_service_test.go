package service

import (
	"context"
	"errors"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

const billedEstablishment = "establishment_123"

func storedSubscription(status domain.SubscriptionStatus, subscriptionID string, periodEnd *time.Time) domain.EstablishmentSubscription {
	row := domain.EstablishmentSubscription{
		ID:               "row-1",
		EstablishmentID:  billedEstablishment,
		Plan:             domain.PlanPro,
		Status:           status,
		StripeCustomerID: new("cus_1"),
		CurrentPeriodEnd: periodEnd,
		Seats:            1,
		CreatedAt:        billingNow,
		UpdatedAt:        billingNow,
	}
	if subscriptionID != "" {
		row.StripeSubscriptionID = &subscriptionID
	}
	return row
}

func liveStripeSubscription(id string) domain.StripeSubscription {
	return domain.StripeSubscription{
		ID:         id,
		Status:     domain.StripeStatusActive,
		CustomerID: "cus_1",
		Items: []domain.StripeSubscriptionItem{{
			ID: "si_1", PriceID: "price_pro_123", Quantity: 4,
			CurrentPeriodStart: billingDate("2026-01-10T00:00:00Z"), CurrentPeriodEnd: billingDate("2026-02-10T00:00:00Z"),
		}},
	}
}

func TestCreateCheckoutSession(t *testing.T) {
	test := newSubscriptionTest(newFakeSubscriptions(domain.EstablishmentSubscription{
		EstablishmentID: billedEstablishment, StripeCustomerID: new("cus_existing"), Status: domain.SubscriptionInactive,
	}), newFakePayments())
	test.repo.members[billedEstablishment] = 12

	session, err := test.service.CreateCheckoutSession(context.Background(), billedEstablishment, domain.PlanPro)
	if err != nil {
		t.Fatal(err)
	}
	if session.ID != "cs_1" || session.URL != "https://checkout.stripe.com/c/pay/cs_1" {
		t.Errorf("session = %+v", session)
	}

	request := test.payments.checkouts[0]
	dashboard := "https://beta.coaster.business/establishments/establishment_123/dashboard"
	if request.CustomerID != "cus_existing" || request.ClientReferenceID != billedEstablishment ||
		request.PriceID != "price_pro_123" || request.Quantity != 12 {
		t.Errorf("request = %+v", request)
	}
	if request.SuccessURL != dashboard+"?billing=success&session_id={CHECKOUT_SESSION_ID}" || request.CancelURL != dashboard+"?billing=cancelled" {
		t.Errorf("urls = %s %s", request.SuccessURL, request.CancelURL)
	}
	if !reflect.DeepEqual(request.Metadata, map[string]string{"establishmentId": billedEstablishment, "plan": "PRO"}) {
		t.Errorf("metadata = %v", request.Metadata)
	}
	if !strings.HasPrefix(request.IdempotencyKey, "checkout:establishment_123:PRO:12:") {
		t.Errorf("idempotency key = %s", request.IdempotencyKey)
	}
	if request.IntegrationIdentifier != integrationIdentifier(request.IdempotencyKey) {
		t.Errorf("integration identifier = %s", request.IntegrationIdentifier)
	}

	untilExpiry := request.ExpiresAt.Sub(billingNow)
	if untilExpiry <= 30*time.Minute || untilExpiry > 2*time.Hour {
		t.Errorf("the session expires in %s, want between 30 minutes and 2 hours", untilExpiry)
	}
}

func TestCheckoutIdempotency(t *testing.T) {
	checkoutAt := func(test *subscriptionTest, establishmentID string, at time.Time) {
		t.Helper()
		test.service.now = func() time.Time { return at }
		if _, err := test.service.CreateCheckoutSession(context.Background(), establishmentID, domain.PlanPro); err != nil {
			t.Fatal(err)
		}
	}
	start := time.Date(2026, 8, 6, 10, 0, 0, 0, time.UTC)

	t.Run("a repeated purchase in the same half hour sends the same key and payload", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
		checkoutAt(test, billedEstablishment, start)
		checkoutAt(test, billedEstablishment, start.Add(7*time.Minute))

		first, second := test.payments.checkouts[0], test.payments.checkouts[1]
		if !reflect.DeepEqual(first, second) {
			t.Errorf("the requests differ:\n%+v\n%+v", first, second)
		}
	})

	t.Run("a changed headcount gets another key", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
		checkoutAt(test, billedEstablishment, start)
		test.repo.members[billedEstablishment] = 2
		checkoutAt(test, billedEstablishment, start)

		if test.payments.checkouts[0].IdempotencyKey == test.payments.checkouts[1].IdempotencyKey {
			t.Errorf("both purchases used %s", test.payments.checkouts[0].IdempotencyKey)
		}
	})

	t.Run("two establishments get different keys", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
		checkoutAt(test, billedEstablishment, start)
		checkoutAt(test, "establishment_other", start)

		if test.payments.checkouts[0].IdempotencyKey == test.payments.checkouts[1].IdempotencyKey {
			t.Errorf("both establishments used %s", test.payments.checkouts[0].IdempotencyKey)
		}
	})
}

func TestCreateCheckoutSessionRefusals(t *testing.T) {
	tomorrow := billingNow.Add(24 * time.Hour)
	yesterday := billingNow.Add(-24 * time.Hour)

	tests := []struct {
		name         string
		row          *domain.EstablishmentSubscription
		stripe       []domain.StripeSubscription
		sessionURL   string
		wantCode     string
		wantCustomer string
	}{
		{name: "no subscription: Stripe creates the customer", wantCustomer: ""},
		{
			name:     "a live Stripe subscription",
			row:      new(storedSubscription(domain.SubscriptionActive, "sub_live", &tomorrow)),
			stripe:   []domain.StripeSubscription{liveStripeSubscription("sub_live")},
			wantCode: domain.CodeStripeSubscriptionAlreadyExists,
		},
		{
			name:     "a cancellation still pending",
			row:      new(storedSubscription(domain.SubscriptionCanceled, "sub_live", &tomorrow)),
			stripe:   []domain.StripeSubscription{liveStripeSubscription("sub_live")},
			wantCode: domain.CodeStripeSubscriptionPendingCancellation,
		},
		{
			name:     "a pending cancellation without a Stripe subscription",
			row:      new(storedSubscription(domain.SubscriptionCanceled, "", &tomorrow)),
			wantCode: domain.CodeStripeSubscriptionPendingCancellation,
		},
		{
			name:         "a stale subscription reference is ignored",
			row:          new(storedSubscription(domain.SubscriptionActive, "sub_stale", &tomorrow)),
			wantCustomer: "cus_1",
		},
		{
			name:         "a terminal cancellation is not asked about",
			row:          new(storedSubscription(domain.SubscriptionCanceled, "sub_live", &yesterday)),
			stripe:       []domain.StripeSubscription{liveStripeSubscription("sub_live")},
			wantCustomer: "cus_1",
		},
		{
			name:       "Stripe answers without a URL",
			sessionURL: "none",
			wantCode:   domain.CodeStripeCheckoutSessionFailed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeSubscriptions()
			if tt.row != nil {
				repo = newFakeSubscriptions(*tt.row)
			}
			payments := newFakePayments(tt.stripe...)
			if tt.sessionURL == "none" {
				payments.sessionURL = ""
			}
			test := newSubscriptionTest(repo, payments)

			_, err := test.service.CreateCheckoutSession(context.Background(), billedEstablishment, domain.PlanPro)
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got := payments.checkouts[0].CustomerID; got != tt.wantCustomer {
				t.Errorf("customer = %q, want %q", got, tt.wantCustomer)
			}
		})
	}
}

func TestCreateCustomerPortalSession(t *testing.T) {
	stale := storedSubscription(domain.SubscriptionActive, "sub_1", nil)
	stale.StripeCustomerID = new("cus_stale")
	remote := liveStripeSubscription("sub_1")
	remote.CustomerID = "cus_remote"
	lookupFailed := domain.Internal(domain.CodeStripeBillingPortalFailed)

	tests := []struct {
		name      string
		row       *domain.EstablishmentSubscription
		stripe    []domain.StripeSubscription
		customers []string
		portalErr error
		wantURL   string
		wantCode  string
		wantAsked []string
	}{
		{name: "no subscription", wantCode: domain.CodeStripeCustomerNotFound},
		{
			name: "no customer", row: new(storedSubscription(domain.SubscriptionInactive, "", nil)),
			wantCode: domain.CodeStripeCustomerNotFound,
		},
		{
			name: "the stored customer", row: new(storedSubscription(domain.SubscriptionActive, "sub_1", nil)), customers: []string{"cus_1"},
			wantURL:   "https://billing.stripe.com/p/cus_1?return=https://beta.coaster.business/establishments/establishment_123/dashboard",
			wantAsked: []string{"cus_1"},
		},
		{
			name: "the customer of the remote subscription when the stored one is gone", row: &stale,
			stripe: []domain.StripeSubscription{remote}, customers: []string{"cus_remote"},
			wantURL:   "https://billing.stripe.com/p/cus_remote?return=https://beta.coaster.business/establishments/establishment_123/dashboard",
			wantAsked: []string{"cus_stale", "cus_remote"},
		},
		{
			name: "no customer anywhere", row: &stale,
			wantCode: domain.CodeStripeCustomerNotFound, wantAsked: []string{"cus_stale"},
		},
		{
			name: "a Stripe failure", row: new(storedSubscription(domain.SubscriptionActive, "sub_1", nil)),
			portalErr: lookupFailed, wantCode: domain.CodeStripeBillingPortalFailed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeSubscriptions()
			if tt.row != nil {
				repo = newFakeSubscriptions(*tt.row)
			}
			payments := newFakePayments(tt.stripe...)
			payments.portalErr = tt.portalErr
			for _, customer := range tt.customers {
				payments.portalCustomers[customer] = true
			}
			test := newSubscriptionTest(repo, payments)

			session, err := test.service.CreateCustomerPortalSession(context.Background(), billedEstablishment)
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
			} else if err != nil || session.URL != tt.wantURL {
				t.Fatalf("session = %+v, %v", session, err)
			}
			if tt.wantAsked != nil && !slices.Equal(payments.portalAsked, tt.wantAsked) {
				t.Errorf("asked the portal for %v, want %v", payments.portalAsked, tt.wantAsked)
			}
		})
	}
}

func TestFindSubscription(t *testing.T) {
	future := billingNow.Add(24 * time.Hour)
	lapsed := billingNow.Add(-time.Hour)

	t.Run("a stored subscription", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionActive, "sub_1", &future)), newFakePayments())

		view, err := test.service.Find(context.Background(), billedEstablishment)
		if err != nil || view.Status != domain.SubscriptionActive || view.ID != "row-1" {
			t.Fatalf("Find = %+v, %v", view, err)
		}
	})

	t.Run("none stored is the default FREE plan", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())

		view, err := test.service.Find(context.Background(), billedEstablishment)
		if err != nil || view.ID != "" || view.Plan != domain.PlanFree || view.Status != domain.SubscriptionInactive {
			t.Fatalf("Find = %+v, %v", view, err)
		}
	})

	t.Run("a lapsed period Stripe no longer knows is EXPIRED", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionActive, "sub_1", &lapsed)), newFakePayments())

		view, err := test.service.Find(context.Background(), billedEstablishment)
		if err != nil || view.Status != domain.SubscriptionExpired {
			t.Fatalf("Find = %+v, %v", view, err)
		}
	})

	t.Run("a lapsed period is asked to Stripe before showing it", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionActive, "sub_1", &lapsed)),
			newFakePayments(liveStripeSubscription("sub_1")))

		view, err := test.service.Find(context.Background(), billedEstablishment)
		if err != nil || view.Status != domain.SubscriptionActive || view.CurrentPeriodEnd.Format(time.RFC3339) != "2026-02-10T00:00:00Z" {
			t.Fatalf("Find = %+v, %v", view, err)
		}
	})

	t.Run("an billedEstablishment that never subscribed is not asked about", func(t *testing.T) {
		payments := newFakePayments()
		payments.lookupErr = errors.New("Stripe must not be called")
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionTrialing, "", &lapsed)), payments)

		if _, err := test.service.Find(context.Background(), billedEstablishment); err != nil {
			t.Fatal(err)
		}
	})
}

func TestSubscriptionSeats(t *testing.T) {
	row := storedSubscription(domain.SubscriptionActive, "sub_1", nil)
	row.Seats = 7
	test := newSubscriptionTest(newFakeSubscriptions(row), newFakePayments())
	test.repo.members[billedEstablishment] = 9

	seats, err := test.service.Seats(context.Background(), billedEstablishment)
	want := domain.SubscriptionSeats{Used: 9, Billed: 7, Included: 10, BasePriceCents: 1999, ExtraPriceCents: 200}
	if err != nil || seats != want {
		t.Errorf("Seats = %+v, %v", seats, err)
	}

	seats, err = test.service.Seats(context.Background(), "never-subscribed")
	want = domain.SubscriptionSeats{Used: 1, Billed: 0, Included: 10, BasePriceCents: 1999, ExtraPriceCents: 200}
	if err != nil || seats != want {
		t.Errorf("Seats of an billedEstablishment that never subscribed = %+v, %v", seats, err)
	}
}

func TestRefreshSubscription(t *testing.T) {
	lapsed := billingNow.Add(-time.Hour)

	t.Run("writes back the period and seats Stripe reports", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionActive, "sub_1", &lapsed)),
			newFakePayments(liveStripeSubscription("sub_1")))
		test.cache.Set(context.Background(), "establishment:establishment_123:subscription", "stale")

		state, err := test.service.Refresh(context.Background(), billedEstablishment)
		if err != nil || state == nil || state.CurrentPeriodEnd.Format(time.RFC3339) != "2026-02-10T00:00:00Z" {
			t.Fatalf("Refresh = %+v, %v", state, err)
		}
		if test.repo.rows[billedEstablishment].Seats != 4 || test.repo.rows[billedEstablishment].Plan != domain.PlanPro {
			t.Errorf("row = %+v", test.repo.rows[billedEstablishment])
		}
		if !slices.Contains(test.cache.forgotten, "establishment:establishment_123:subscription") {
			t.Errorf("the cached subscription was not forgotten")
		}
	})

	t.Run("an billedEstablishment that never subscribed writes nothing", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())

		state, err := test.service.Refresh(context.Background(), billedEstablishment)
		if err != nil || state != nil || len(test.repo.refreshes) != 0 {
			t.Fatalf("Refresh = %+v, %v", state, err)
		}
	})

	t.Run("a subscription Stripe no longer knows is left alone", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(storedSubscription(domain.SubscriptionActive, "sub_1", &lapsed)), newFakePayments())

		state, err := test.service.Refresh(context.Background(), billedEstablishment)
		if err != nil || state == nil || state.Status != domain.SubscriptionActive || len(test.repo.refreshes) != 0 {
			t.Fatalf("Refresh = %+v, %v", state, err)
		}
	})
}

func TestSyncSeats(t *testing.T) {
	withSeats := func(seats int) domain.EstablishmentSubscription {
		row := storedSubscription(domain.SubscriptionActive, "sub_1", nil)
		row.Seats = seats
		return row
	}

	tests := []struct {
		name    string
		rows    []domain.EstablishmentSubscription
		members int
		billing BillingConfig
		want    []string
	}{
		{name: "the new headcount goes to Stripe", rows: []domain.EstablishmentSubscription{withSeats(3)}, members: 5, billing: testBilling, want: []string{"sub_1:price_pro_123:5"}},
		{name: "no Stripe subscription", rows: []domain.EstablishmentSubscription{storedSubscription(domain.SubscriptionTrialing, "", nil)}, members: 5, billing: testBilling},
		{name: "never projected", members: 5, billing: testBilling},
		{name: "the headcount did not move", rows: []domain.EstablishmentSubscription{withSeats(5)}, members: 5, billing: testBilling},
		{name: "no price to bill seats at", rows: []domain.EstablishmentSubscription{withSeats(3)}, members: 5, billing: BillingConfig{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			test := newSubscriptionTest(newFakeSubscriptions(tt.rows...), newFakePayments())
			test.service.billing = tt.billing
			test.repo.members[billedEstablishment] = tt.members

			if err := test.service.SyncSeats(context.Background(), billedEstablishment); err != nil {
				t.Fatal(err)
			}
			if !slices.Equal(test.payments.seatUpdates, tt.want) {
				t.Errorf("seat updates = %v, want %v", test.payments.seatUpdates, tt.want)
			}
		})
	}
}

func TestSubscriptionChangesForgetTheCacheAndReachRealtime(t *testing.T) {
	test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())

	deliver(test.service.EventHandlers(), domain.SubscriptionRenewedEvent{EstablishmentID: "establishment-1", StripeSubscriptionID: "sub_123"})
	deliver(test.service.EventHandlers(), domain.SubscriptionCancelledEvent{EstablishmentID: "establishment-2"})
	deliver(test.service.EventHandlers(), domain.DuplicateSubscriptionDetectedEvent{EstablishmentID: "establishment-3"})

	wantForgotten := []string{"establishment:establishment-1:subscription", "establishment:establishment-2:subscription"}
	if !slices.Equal(test.cache.forgotten, wantForgotten) {
		t.Errorf("forgotten = %v, want %v", test.cache.forgotten, wantForgotten)
	}

	want := []realtimeMessage{
		{establishmentID: "establishment-1", event: domain.RealtimeSubscriptionUpdated, payload: map[string]string{"establishmentId": "establishment-1"}},
		{establishmentID: "establishment-2", event: domain.RealtimeSubscriptionUpdated, payload: map[string]string{"establishmentId": "establishment-2"}},
	}
	if !reflect.DeepEqual(test.realtime.messages, want) {
		t.Errorf("messages = %+v, want %+v", test.realtime.messages, want)
	}
}
