package service

import (
	"context"
	"reflect"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

func (test *subscriptionTest) deliver(event domain.StripeEvent) error {
	test.payments.event = &event
	return test.service.HandleWebhook(context.Background(), []byte("{}"), "t=1,v1=signature")
}

func checkoutCompleted(session domain.StripeCheckoutSession) domain.StripeEvent {
	return domain.StripeEvent{ID: "evt_1", Type: domain.StripeEventCheckoutCompleted, CheckoutSession: &session}
}

func subscriptionUpdated(subscription domain.StripeSubscription) domain.StripeEvent {
	return domain.StripeEvent{ID: "evt_1", Type: domain.StripeEventSubscriptionUpdated, Subscription: &subscription}
}

func invoiceEvent(eventType string, invoice domain.StripeInvoice) domain.StripeEvent {
	return domain.StripeEvent{ID: "evt_1", Type: eventType, Invoice: &invoice}
}

func TestWebhookSignatureErrors(t *testing.T) {
	test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
	test.payments.parseErr = domain.BadRequest(domain.CodeStripeWebhookSignatureInvalid)

	err := test.service.HandleWebhook(context.Background(), []byte("{}"), "bad")
	if !domain.HasCode(err, domain.CodeStripeWebhookSignatureInvalid) {
		t.Errorf("err = %v", err)
	}
}

func TestWebhookIgnoresUnhandledEvents(t *testing.T) {
	test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())

	if err := test.deliver(domain.StripeEvent{ID: "evt_1", Type: "customer.created"}); err != nil {
		t.Fatal(err)
	}
	if len(test.repo.upserts) != 0 || len(test.events.events) != 0 {
		t.Errorf("an unhandled event changed something")
	}
}

func TestCheckoutCompleted(t *testing.T) {
	session := domain.StripeCheckoutSession{
		ID: "cs_1", Mode: "subscription", CustomerID: "cus_123", SubscriptionID: "sub_new",
		Metadata: map[string]string{"establishmentId": "establishment-1"},
	}

	t.Run("writes the state read back from Stripe", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments(liveStripeSubscription("sub_new")))

		if err := test.deliver(checkoutCompleted(session)); err != nil {
			t.Fatal(err)
		}

		upsert := test.repo.upserts[0]
		if upsert.Plan != domain.PlanPro || upsert.Status != domain.SubscriptionActive || upsert.StripeCustomerID != "cus_123" ||
			*upsert.StripeSubscriptionID != "sub_new" || upsert.Billing == nil || upsert.Billing.Seats != 4 {
			t.Errorf("upsert = %+v", upsert)
		}
		want := []any{domain.SubscriptionActivatedEvent{EstablishmentID: "establishment-1", StripeSubscriptionID: "sub_new"}}
		if !reflect.DeepEqual(test.events.events, want) {
			t.Errorf("events = %v", test.events.events)
		}
	})

	t.Run("links the references as inactive while Stripe does not know the subscription", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())

		if err := test.deliver(checkoutCompleted(session)); err != nil {
			t.Fatal(err)
		}

		upsert := test.repo.upserts[0]
		if upsert.Plan != domain.PlanFree || upsert.Status != domain.SubscriptionInactive || upsert.Billing != nil ||
			*upsert.StripeSubscriptionID != "sub_new" || upsert.StripeCustomerID != "cus_123" {
			t.Errorf("upsert = %+v", upsert)
		}
	})

	t.Run("falls back to client_reference_id", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
		withReference := session
		withReference.Metadata = nil
		withReference.ClientReferenceID = "establishment-2"

		if err := test.deliver(checkoutCompleted(withReference)); err != nil {
			t.Fatal(err)
		}
		if _, ok := test.repo.rows["establishment-2"]; !ok {
			t.Errorf("establishment-2 was not linked")
		}
	})

	t.Run("ignores sessions that are not for a subscription", func(t *testing.T) {
		test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
		payment := session
		payment.Mode = "payment"

		if err := test.deliver(checkoutCompleted(payment)); err != nil || len(test.repo.upserts) != 0 {
			t.Fatalf("err = %v, upserts = %v", err, test.repo.upserts)
		}
	})

	missing := []struct {
		name   string
		change func(*domain.StripeCheckoutSession)
		code   string
	}{
		{"establishment", func(s *domain.StripeCheckoutSession) { s.Metadata = nil }, domain.CodeStripeWebhookEstablishmentIdMissing},
		{"customer", func(s *domain.StripeCheckoutSession) { s.CustomerID = "" }, domain.CodeStripeWebhookCustomerMissing},
		{"subscription", func(s *domain.StripeCheckoutSession) { s.SubscriptionID = "" }, domain.CodeStripeWebhookSubscriptionMissing},
	}
	for _, tt := range missing {
		t.Run("fails without the "+tt.name, func(t *testing.T) {
			test := newSubscriptionTest(newFakeSubscriptions(), newFakePayments())
			broken := session
			tt.change(&broken)

			if err := test.deliver(checkoutCompleted(broken)); !domain.HasCode(err, tt.code) {
				t.Errorf("err = %v, want %s", err, tt.code)
			}
		})
	}
}

func TestCheckoutCompletedDuplicates(t *testing.T) {
	session := domain.StripeCheckoutSession{
		ID: "cs_2", Mode: "subscription", CustomerID: "cus_123", SubscriptionID: "sub_duplicate",
		Metadata: map[string]string{"establishmentId": "establishment-1"},
	}
	tracking := func(subscriptionID string) *fakeSubscriptions {
		return newFakeSubscriptions(domain.EstablishmentSubscription{
			EstablishmentID: "establishment-1", StripeSubscriptionID: &subscriptionID, Status: domain.SubscriptionActive,
		})
	}
	dead := liveStripeSubscription("sub_original")
	dead.Status = domain.StripeStatusCanceled

	t.Run("cancels a second subscription instead of overwriting the live one", func(t *testing.T) {
		test := newSubscriptionTest(tracking("sub_original"), newFakePayments(liveStripeSubscription("sub_original")))

		if err := test.deliver(checkoutCompleted(session)); err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(test.payments.cancelled, []string{"sub_duplicate"}) || len(test.repo.upserts) != 0 {
			t.Errorf("cancelled = %v, upserts = %v", test.payments.cancelled, test.repo.upserts)
		}
		want := []any{domain.DuplicateSubscriptionDetectedEvent{
			EstablishmentID: "establishment-1", KeptSubscriptionID: "sub_original", CancelledSubscriptionID: "sub_duplicate",
		}}
		if !reflect.DeepEqual(test.events.events, want) {
			t.Errorf("events = %v", test.events.events)
		}
	})

	t.Run("accepts a repurchase once the tracked subscription is dead", func(t *testing.T) {
		test := newSubscriptionTest(tracking("sub_original"), newFakePayments(dead))

		if err := test.deliver(checkoutCompleted(session)); err != nil {
			t.Fatal(err)
		}
		if len(test.payments.cancelled) != 0 || len(test.repo.upserts) != 1 {
			t.Errorf("cancelled = %v, upserts = %v", test.payments.cancelled, test.repo.upserts)
		}
	})

	t.Run("accepts a repurchase when Stripe no longer knows the tracked subscription", func(t *testing.T) {
		test := newSubscriptionTest(tracking("sub_gone"), newFakePayments())

		if err := test.deliver(checkoutCompleted(session)); err != nil {
			t.Fatal(err)
		}
		if len(test.payments.cancelled) != 0 || len(test.repo.upserts) != 1 {
			t.Errorf("cancelled = %v, upserts = %v", test.payments.cancelled, test.repo.upserts)
		}
	})

	t.Run("stays idempotent when the same webhook arrives twice", func(t *testing.T) {
		test := newSubscriptionTest(tracking("sub_duplicate"), newFakePayments(liveStripeSubscription("sub_duplicate")))

		for range 2 {
			if err := test.deliver(checkoutCompleted(session)); err != nil {
				t.Fatal(err)
			}
		}
		if len(test.payments.cancelled) != 0 || len(test.repo.upserts) != 2 || !reflect.DeepEqual(test.repo.upserts[0], test.repo.upserts[1]) {
			t.Errorf("cancelled = %v, upserts = %+v", test.payments.cancelled, test.repo.upserts)
		}
	})
}

func TestSubscriptionChanged(t *testing.T) {
	tracked := func(subscriptionID string) domain.EstablishmentSubscription {
		return domain.EstablishmentSubscription{
			EstablishmentID: "establishment-1", StripeCustomerID: new("cus_1"),
			StripeSubscriptionID: &subscriptionID, Status: domain.SubscriptionActive,
		}
	}
	dead := liveStripeSubscription("sub_old")
	dead.Status = domain.StripeStatusCanceled
	terminal := liveStripeSubscription("sub_1")
	terminal.Status, terminal.CanceledAt = domain.StripeStatusCanceled, billingDate("2026-01-12T00:00:00Z")
	scheduled := liveStripeSubscription("sub_1")
	scheduled.CancelAtPeriodEnd = true
	orphan := liveStripeSubscription("sub_orphan")
	orphan.CustomerID = "cus_orphan"
	fromMetadata := liveStripeSubscription("sub_new")
	fromMetadata.CustomerID = "cus_new"
	fromMetadata.Metadata = map[string]string{"establishmentId": "establishment-9"}
	noCustomer := liveStripeSubscription("sub_1")
	noCustomer.CustomerID = ""

	tests := []struct {
		name         string
		rows         []domain.EstablishmentSubscription
		stripe       []domain.StripeSubscription
		incoming     domain.StripeSubscription
		wantCode     string
		wantUpserted string
		wantEvents   []string
		wantStatus   domain.SubscriptionStatus
		wantPlan     domain.SubscriptionPlan
		wantKeepsID  bool
	}{
		{
			name: "ignores an untracked subscription while the tracked one is live",
			rows: []domain.EstablishmentSubscription{tracked("sub_live")}, stripe: []domain.StripeSubscription{liveStripeSubscription("sub_live")},
			incoming: liveStripeSubscription("sub_other"),
		},
		{
			name: "processes a subscription that replaced a dead one",
			rows: []domain.EstablishmentSubscription{tracked("sub_old")}, stripe: []domain.StripeSubscription{dead},
			incoming: liveStripeSubscription("sub_new"), wantUpserted: "establishment-1",
			wantEvents: []string{"SubscriptionRenewedEvent"}, wantStatus: domain.SubscriptionActive, wantPlan: domain.PlanPro, wantKeepsID: true,
		},
		{name: "fails without a customer", incoming: noCustomer, wantCode: domain.CodeStripeWebhookCustomerMissing},
		{name: "acknowledges a subscription of no establishment", incoming: orphan},
		{
			name: "ACTIVE with its period", rows: []domain.EstablishmentSubscription{tracked("sub_1")},
			incoming: liveStripeSubscription("sub_1"), wantUpserted: "establishment-1",
			wantEvents: []string{"SubscriptionRenewedEvent"}, wantStatus: domain.SubscriptionActive, wantPlan: domain.PlanPro, wantKeepsID: true,
		},
		{
			name: "falls back to metadata.establishmentId", incoming: fromMetadata, wantUpserted: "establishment-9",
			wantEvents: []string{"SubscriptionRenewedEvent"}, wantStatus: domain.SubscriptionActive, wantPlan: domain.PlanPro, wantKeepsID: true,
		},
		{
			name: "a terminal cancellation is CANCELED, FREE and without id", rows: []domain.EstablishmentSubscription{tracked("sub_1")},
			incoming: terminal, wantUpserted: "establishment-1",
			wantEvents: []string{"SubscriptionCancelledEvent"}, wantStatus: domain.SubscriptionCanceled, wantPlan: domain.PlanFree, wantKeepsID: false,
		},
		{
			name: "a scheduled cancellation is CANCELED and keeps the id", rows: []domain.EstablishmentSubscription{tracked("sub_1")},
			incoming: scheduled, wantUpserted: "establishment-1",
			wantEvents: []string{"SubscriptionCancelledEvent"}, wantStatus: domain.SubscriptionCanceled, wantPlan: domain.PlanPro, wantKeepsID: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			test := newSubscriptionTest(newFakeSubscriptions(tt.rows...), newFakePayments(tt.stripe...))

			err := test.deliver(subscriptionUpdated(tt.incoming))
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if tt.wantUpserted == "" {
				if len(test.repo.upserts) != 0 {
					t.Errorf("upserts = %+v, want none", test.repo.upserts)
				}
				return
			}

			row := test.repo.rows[tt.wantUpserted]
			if row == nil || row.Status != tt.wantStatus || row.Plan != tt.wantPlan || (row.StripeSubscriptionID != nil) != tt.wantKeepsID {
				t.Errorf("row = %+v", row)
			}
			if !slices.Equal(test.events.names(), tt.wantEvents) {
				t.Errorf("events = %v, want %v", test.events.names(), tt.wantEvents)
			}
		})
	}
}

func TestInvoiceEvents(t *testing.T) {
	stored := func(status domain.SubscriptionStatus) domain.EstablishmentSubscription {
		return domain.EstablishmentSubscription{
			EstablishmentID: "establishment-1", StripeCustomerID: new("cus_1"),
			StripeSubscriptionID: new("sub_1"), Status: status,
		}
	}

	tests := []struct {
		name       string
		eventType  string
		row        domain.EstablishmentSubscription
		invoice    domain.StripeInvoice
		wantStatus domain.SubscriptionStatus
		wantEvent  any
	}{
		{
			name: "paid: nothing without customer and subscription", eventType: domain.StripeEventInvoicePaid,
			row: stored(domain.SubscriptionPastDue), invoice: domain.StripeInvoice{ID: "in_1"}, wantStatus: domain.SubscriptionPastDue,
		},
		{
			name: "paid: nothing for an unknown subscription", eventType: domain.StripeEventInvoicePaid,
			row: stored(domain.SubscriptionPastDue), invoice: domain.StripeInvoice{ID: "in_1", SubscriptionID: "sub_other"}, wantStatus: domain.SubscriptionPastDue,
		},
		{
			name: "paid: an active subscription is left alone", eventType: domain.StripeEventInvoicePaid,
			row: stored(domain.SubscriptionActive), invoice: domain.StripeInvoice{ID: "in_1", SubscriptionID: "sub_1"}, wantStatus: domain.SubscriptionActive,
		},
		{
			name: "paid: PAST_DUE recovers", eventType: domain.StripeEventInvoicePaid,
			row: stored(domain.SubscriptionPastDue), invoice: domain.StripeInvoice{ID: "in_1", CustomerID: "cus_1", SubscriptionID: "sub_1"},
			wantStatus: domain.SubscriptionActive,
			wantEvent:  domain.SubscriptionRenewedEvent{EstablishmentID: "establishment-1", StripeSubscriptionID: "sub_1"},
		},
		{
			name: "paid: UNPAID found by customer recovers", eventType: domain.StripeEventInvoicePaid,
			row: stored(domain.SubscriptionUnpaid), invoice: domain.StripeInvoice{ID: "in_1", CustomerID: "cus_1"},
			wantStatus: domain.SubscriptionActive,
			wantEvent:  domain.SubscriptionRenewedEvent{EstablishmentID: "establishment-1", StripeSubscriptionID: "sub_1"},
		},
		{
			name: "failed: nothing without customer and subscription", eventType: domain.StripeEventInvoicePaymentFailed,
			row: stored(domain.SubscriptionActive), invoice: domain.StripeInvoice{ID: "in_1"}, wantStatus: domain.SubscriptionActive,
		},
		{
			name: "failed: nothing for an unknown subscription", eventType: domain.StripeEventInvoicePaymentFailed,
			row: stored(domain.SubscriptionActive), invoice: domain.StripeInvoice{ID: "in_1", SubscriptionID: "sub_other"}, wantStatus: domain.SubscriptionActive,
		},
		{
			name: "failed: marks PAST_DUE", eventType: domain.StripeEventInvoicePaymentFailed,
			row: stored(domain.SubscriptionActive), invoice: domain.StripeInvoice{ID: "in_1", CustomerID: "cus_1", SubscriptionID: "sub_1"},
			wantStatus: domain.SubscriptionPastDue,
			wantEvent:  domain.SubscriptionPaymentFailedEvent{EstablishmentID: "establishment-1", StripeCustomerID: "cus_1"},
		},
		{
			name: "failed: found by customer", eventType: domain.StripeEventInvoicePaymentFailed,
			row: stored(domain.SubscriptionActive), invoice: domain.StripeInvoice{ID: "in_1", CustomerID: "cus_1"},
			wantStatus: domain.SubscriptionPastDue,
			wantEvent:  domain.SubscriptionPaymentFailedEvent{EstablishmentID: "establishment-1", StripeCustomerID: "cus_1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			test := newSubscriptionTest(newFakeSubscriptions(tt.row), newFakePayments())

			if err := test.deliver(invoiceEvent(tt.eventType, tt.invoice)); err != nil {
				t.Fatal(err)
			}
			if got := test.repo.rows["establishment-1"].Status; got != tt.wantStatus {
				t.Errorf("status = %s, want %s", got, tt.wantStatus)
			}

			var want []any
			if tt.wantEvent != nil {
				want = []any{tt.wantEvent}
			}
			if !reflect.DeepEqual(test.events.events, want) {
				t.Errorf("events = %+v, want %+v", test.events.events, want)
			}
		})
	}
}
