package service

import (
	"context"
	"strconv"
	"sync"
	"time"

	"coaster-api/internal/core/domain"
)

type fakeSubscriptions struct {
	rows      map[string]*domain.EstablishmentSubscription
	members   map[string]int
	upserts   []domain.SubscriptionUpsert
	refreshes []domain.SubscriptionSnapshot
}

func newFakeSubscriptions(rows ...domain.EstablishmentSubscription) *fakeSubscriptions {
	fake := &fakeSubscriptions{rows: make(map[string]*domain.EstablishmentSubscription), members: make(map[string]int)}
	for _, row := range rows {
		fake.rows[row.EstablishmentID] = &row
	}
	return fake
}

func (f *fakeSubscriptions) copyOf(row *domain.EstablishmentSubscription) *domain.EstablishmentSubscription {
	if row == nil {
		return nil
	}
	copied := *row
	return &copied
}

func (f *fakeSubscriptions) FindByEstablishmentID(_ context.Context, establishmentID string) (*domain.EstablishmentSubscription, error) {
	return f.copyOf(f.rows[establishmentID]), nil
}

func (f *fakeSubscriptions) FindByStripeCustomerID(_ context.Context, customerID string) (*domain.EstablishmentSubscription, error) {
	for _, row := range f.rows {
		if row.StripeCustomerID != nil && *row.StripeCustomerID == customerID {
			return f.copyOf(row), nil
		}
	}
	return nil, nil
}

func (f *fakeSubscriptions) FindByStripeSubscriptionID(_ context.Context, subscriptionID string) (*domain.EstablishmentSubscription, error) {
	for _, row := range f.rows {
		if row.StripeSubscriptionID != nil && *row.StripeSubscriptionID == subscriptionID {
			return f.copyOf(row), nil
		}
	}
	return nil, nil
}

func (f *fakeSubscriptions) CountBillableSeats(_ context.Context, establishmentID string) (int, error) {
	return max(f.members[establishmentID], 1), nil
}

func (f *fakeSubscriptions) UpdateStatus(_ context.Context, establishmentID string, status domain.SubscriptionStatus) error {
	f.rows[establishmentID].Status = status
	return nil
}

func (f *fakeSubscriptions) Upsert(_ context.Context, establishmentID string, data domain.SubscriptionUpsert) error {
	f.upserts = append(f.upserts, data)

	row, ok := f.rows[establishmentID]
	if !ok {
		row = &domain.EstablishmentSubscription{ID: "new", EstablishmentID: establishmentID, Seats: 1}
		f.rows[establishmentID] = row
	}

	customerID := data.StripeCustomerID
	row.Plan, row.Status = data.Plan, data.Status
	row.StripeCustomerID, row.StripeSubscriptionID = &customerID, data.StripeSubscriptionID
	if data.Billing != nil {
		row.Seats = data.Billing.Seats
		row.CurrentPeriodStart, row.CurrentPeriodEnd = data.Billing.CurrentPeriodStart, data.Billing.CurrentPeriodEnd
		row.TrialEndsAt, row.CanceledAt = data.Billing.TrialEndsAt, data.Billing.CanceledAt
	}
	return nil
}

func (f *fakeSubscriptions) UpdateFromStripe(_ context.Context, establishmentID string, snapshot domain.SubscriptionSnapshot) error {
	f.refreshes = append(f.refreshes, snapshot)

	row := f.rows[establishmentID]
	row.Status, row.StripeSubscriptionID = snapshot.Status, snapshot.StripeSubscriptionID
	row.Seats = snapshot.Billing.Seats
	row.CurrentPeriodStart, row.CurrentPeriodEnd = snapshot.Billing.CurrentPeriodStart, snapshot.Billing.CurrentPeriodEnd
	row.TrialEndsAt, row.CanceledAt = snapshot.Billing.TrialEndsAt, snapshot.Billing.CanceledAt
	return nil
}

type fakePayments struct {
	subscriptions map[string]*domain.StripeSubscription

	portalCustomers map[string]bool
	lookupErr       error
	portalErr       error
	sessionURL      string
	event           *domain.StripeEvent
	parseErr        error

	checkouts   []domain.CheckoutRequest
	cancelled   []string
	portalAsked []string
	seatUpdates []string
}

func newFakePayments(subscriptions ...domain.StripeSubscription) *fakePayments {
	fake := &fakePayments{
		subscriptions:   make(map[string]*domain.StripeSubscription),
		portalCustomers: make(map[string]bool),
		sessionURL:      "https://checkout.stripe.com/c/pay/cs_1",
	}
	for _, subscription := range subscriptions {
		fake.subscriptions[subscription.ID] = &subscription
	}
	return fake
}

func (f *fakePayments) CreateCheckoutSession(_ context.Context, request domain.CheckoutRequest) (*domain.StripeCheckoutSession, error) {
	f.checkouts = append(f.checkouts, request)
	return &domain.StripeCheckoutSession{ID: "cs_1", URL: f.sessionURL}, nil
}

func (f *fakePayments) CancelSubscription(_ context.Context, subscriptionID string) (bool, error) {
	f.cancelled = append(f.cancelled, subscriptionID)
	return true, nil
}

func (f *fakePayments) CreateBillingPortalSession(_ context.Context, customerID, returnURL string) (string, error) {
	f.portalAsked = append(f.portalAsked, customerID)
	if f.portalErr != nil {
		return "", f.portalErr
	}
	if !f.portalCustomers[customerID] {
		return "", nil
	}
	return "https://billing.stripe.com/p/" + customerID + "?return=" + returnURL, nil
}

func (f *fakePayments) RetrieveSubscription(_ context.Context, subscriptionID string) (*domain.StripeSubscription, error) {
	if f.lookupErr != nil {
		return nil, f.lookupErr
	}
	subscription, ok := f.subscriptions[subscriptionID]
	if !ok {
		return nil, nil
	}
	copied := *subscription
	return &copied, nil
}

func (f *fakePayments) UpdateSubscriptionSeats(_ context.Context, subscriptionID string, seats int, priceID string) (bool, error) {
	f.seatUpdates = append(f.seatUpdates, subscriptionID+":"+priceID+":"+strconv.Itoa(seats))
	return true, nil
}

func (f *fakePayments) ParseWebhook([]byte, string) (*domain.StripeEvent, error) {
	return f.event, f.parseErr
}

type recordedEvents struct {
	mu     sync.Mutex
	events []any
}

func (r *recordedEvents) Publish(_ context.Context, event any) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, event)
}

func (r *recordedEvents) names() []string {
	var names []string
	for _, event := range r.events {
		names = append(names, eventName(event))
	}
	return names
}

type recordedRealtime struct {
	published []string
	payloads  []any
}

func (r *recordedRealtime) Publish(establishmentID, event string, payload any) {
	r.published = append(r.published, establishmentID+":"+event)
	r.payloads = append(r.payloads, payload)
}

func (r *recordedRealtime) Revoke(string, string) {}

type subscriptionTest struct {
	service  *SubscriptionService
	repo     *fakeSubscriptions
	payments *fakePayments
	events   *recordedEvents
	realtime *recordedRealtime
	cache    *fakeCache
}

var billingNow = time.Date(2026, 1, 15, 10, 0, 0, 0, time.UTC)

var testBilling = BillingConfig{
	PricePro:            "price_pro_123",
	FrontendURL:         "https://beta.coaster.business",
	BasePriceCents:      1999,
	IncludedSeats:       10,
	ExtraSeatPriceCents: 200,
}

func newSubscriptionTest(repo *fakeSubscriptions, payments *fakePayments) *subscriptionTest {
	test := &subscriptionTest{
		repo:     repo,
		payments: payments,
		events:   &recordedEvents{},
		realtime: &recordedRealtime{},
		cache:    newFakeCache(),
	}
	test.service = NewSubscriptionService(SubscriptionDependencies{
		Repo:     repo,
		Payments: payments,
		Cache:    test.cache,
		Events:   test.events,
		Realtime: test.realtime,
		Billing:  testBilling,
	})
	test.service.now = func() time.Time { return billingNow }
	return test
}

func billingDate(value string) *time.Time {
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return &t
}

func billingText(value string) *string { return &value }
