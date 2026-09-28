package payment

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stripe/stripe-go/v86"
	"github.com/stripe/stripe-go/v86/webhook"

	"coaster-api/internal/core/domain"
)

type stripeCall struct {
	method         string
	path           string
	form           url.Values
	idempotencyKey string
}

type fakeStripe struct {
	mu      sync.Mutex
	answers map[string][]fakeAnswer
	calls   []stripeCall
}

type fakeAnswer struct {
	status int
	body   string
}

func (f *fakeStripe) answer(route string, status int, body string) {
	f.answers[route] = append(f.answers[route], fakeAnswer{status: status, body: body})
}

func (f *fakeStripe) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	r.ParseForm()
	f.calls = append(f.calls, stripeCall{
		method: r.Method, path: r.URL.Path, form: r.PostForm, idempotencyKey: r.Header.Get("Idempotency-Key"),
	})

	route := r.Method + " " + r.URL.Path
	answers := f.answers[route]
	if len(answers) == 0 {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":{"type":"api_error","message":"no answer for ` + route + `"}}`))
		return
	}

	next := answers[0]
	if len(answers) > 1 {
		f.answers[route] = answers[1:]
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(next.status)
	w.Write([]byte(next.body))
}

func missing(resource, id string) string {
	return `{"error":{"type":"invalid_request_error","code":"resource_missing","param":"` + resource +
		`","message":"No such ` + resource + `: '` + id + `'"}}`
}

const refused = `{"error":{"type":"card_error","code":"card_declined","message":"Your card was declined."}}`

func newTestGateway(t *testing.T) (*StripeGateway, *fakeStripe) {
	t.Helper()

	fake := &fakeStripe{answers: make(map[string][]fakeAnswer)}
	server := httptest.NewServer(fake)
	t.Cleanup(server.Close)

	backends := stripe.NewBackendsWithConfig(&stripe.BackendConfig{
		URL:               stripe.String(server.URL),
		MaxNetworkRetries: stripe.Int64(0),
		LeveledLogger:     &stripe.LeveledLogger{Level: stripe.LevelNull},
	})
	return newStripeGateway("sk_test_123", "whsec_test", backends), fake
}

func subscriptionOn(priceID string, quantity int) string {
	return `{"id":"sub_1","object":"subscription","status":"active","customer":"cus_remote",
		"items":{"object":"list","data":[{"id":"si_1","quantity":` + strconv.Itoa(quantity) + `,"price":{"id":"` + priceID + `"},
		"current_period_start":1767225600,"current_period_end":1769904000}]}}`
}

func TestUpdateSubscriptionSeats(t *testing.T) {
	tests := []struct {
		name        string
		retrieve    fakeAnswer
		update      *fakeAnswer
		seats       int
		want        bool
		wantCode    string
		wantUpdated bool
	}{
		{name: "another price is left alone", retrieve: fakeAnswer{200, subscriptionOn("price_flat_legacy", 1)}, seats: 12},
		{name: "the same quantity does not call Stripe", retrieve: fakeAnswer{200, subscriptionOn("price_per_seat", 7)}, seats: 7},
		{
			name: "the quantity moves with prorations", retrieve: fakeAnswer{200, subscriptionOn("price_per_seat", 7)},
			update: &fakeAnswer{200, subscriptionOn("price_per_seat", 12)}, seats: 12, want: true, wantUpdated: true,
		},
		{name: "a subscription that is gone", retrieve: fakeAnswer{404, missing("subscription", "sub_1")}, seats: 12},
		{
			name: "Stripe refuses the update", retrieve: fakeAnswer{200, subscriptionOn("price_per_seat", 7)},
			update: &fakeAnswer{402, refused}, seats: 12, wantCode: domain.CodeStripeSubscriptionSeatsUpdateFailed, wantUpdated: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gateway, fake := newTestGateway(t)
			fake.answer("GET /v1/subscriptions/sub_1", tt.retrieve.status, tt.retrieve.body)
			if tt.update != nil {
				fake.answer("POST /v1/subscriptions/sub_1", tt.update.status, tt.update.body)
			}

			got, err := gateway.UpdateSubscriptionSeats(context.Background(), "sub_1", tt.seats, "price_per_seat")
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
			} else if err != nil || got != tt.want {
				t.Fatalf("UpdateSubscriptionSeats = %v, %v", got, err)
			}

			var update *stripeCall
			for i := range fake.calls {
				if fake.calls[i].method == http.MethodPost {
					update = &fake.calls[i]
				}
			}
			if (update != nil) != tt.wantUpdated {
				t.Fatalf("update call = %+v", update)
			}
			if update != nil && (update.form.Get("items[0][id]") != "si_1" || update.form.Get("items[0][quantity]") != "12" ||
				update.form.Get("proration_behavior") != "create_prorations") {
				t.Errorf("update form = %v", update.form)
			}
		})
	}
}

func checkoutRequest() domain.CheckoutRequest {
	return domain.CheckoutRequest{
		SuccessURL:            "https://app/success",
		CancelURL:             "https://app/cancel",
		ClientReferenceID:     "establishment-1",
		PriceID:               "price_pro",
		Quantity:              3,
		ExpiresAt:             time.Unix(1790000000, 0),
		IntegrationIdentifier: "coaster_subscription_abcdefgh",
		Metadata:              map[string]string{"establishmentId": "establishment-1", "plan": "PRO"},
		CustomerID:            "cus_1",
		IdempotencyKey:        "checkout:establishment-1:PRO:3:900",
	}
}

const createdSession = `{"id":"cs_1","object":"checkout.session","url":"https://checkout.stripe.com/c/pay/cs_1","mode":"subscription"}`

func TestCreateCheckoutSession(t *testing.T) {
	t.Run("sends the whole request with the customer", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("POST /v1/checkout/sessions", 200, createdSession)

		session, err := gateway.CreateCheckoutSession(context.Background(), checkoutRequest())
		if err != nil || session.ID != "cs_1" || session.URL != "https://checkout.stripe.com/c/pay/cs_1" {
			t.Fatalf("session = %+v, %v", session, err)
		}

		call := fake.calls[0]
		want := map[string]string{
			"mode":                                         "subscription",
			"success_url":                                  "https://app/success",
			"cancel_url":                                   "https://app/cancel",
			"client_reference_id":                          "establishment-1",
			"allow_promotion_codes":                        "true",
			"automatic_tax[enabled]":                       "true",
			"billing_address_collection":                   "required",
			"tax_id_collection[enabled]":                   "true",
			"expires_at":                                   "1790000000",
			"line_items[0][price]":                         "price_pro",
			"line_items[0][quantity]":                      "3",
			"integration_identifier":                       "coaster_subscription_abcdefgh",
			"metadata[establishmentId]":                    "establishment-1",
			"metadata[plan]":                               "PRO",
			"subscription_data[metadata][establishmentId]": "establishment-1",
			"subscription_data[metadata][plan]":            "PRO",
			"customer":                                     "cus_1",
			"customer_update[address]":                     "auto",
		}
		for key, value := range want {
			if got := call.form.Get(key); got != value {
				t.Errorf("%s = %q, want %q", key, got, value)
			}
		}
		if call.idempotencyKey != "checkout:establishment-1:PRO:3:900" {
			t.Errorf("idempotency key = %q", call.idempotencyKey)
		}
	})

	t.Run("without a customer there is no customer_update", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("POST /v1/checkout/sessions", 200, createdSession)
		request := checkoutRequest()
		request.CustomerID = ""

		if _, err := gateway.CreateCheckoutSession(context.Background(), request); err != nil {
			t.Fatal(err)
		}
		if fake.calls[0].form.Has("customer") || fake.calls[0].form.Has("customer_update[address]") {
			t.Errorf("form = %v", fake.calls[0].form)
		}
	})

	t.Run("retries without a customer Stripe no longer knows, with another key", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("POST /v1/checkout/sessions", 400, missing("customer", "cus_1"))
		fake.answer("POST /v1/checkout/sessions", 200, createdSession)

		session, err := gateway.CreateCheckoutSession(context.Background(), checkoutRequest())
		if err != nil || session.ID != "cs_1" {
			t.Fatalf("session = %+v, %v", session, err)
		}

		if len(fake.calls) != 2 {
			t.Fatalf("calls = %d, want 2", len(fake.calls))
		}
		retry := fake.calls[1]
		if retry.form.Has("customer") || retry.form.Has("customer_update[address]") {
			t.Errorf("the retry still carries the customer: %v", retry.form)
		}
		if retry.idempotencyKey != "checkout:establishment-1:PRO:3:900:no-customer" {
			t.Errorf("retry key = %q", retry.idempotencyKey)
		}
	})

	failures := []struct {
		name    string
		answers []fakeAnswer
	}{
		{"an unrelated failure", []fakeAnswer{{500, `{"error":{"type":"api_error","message":"Stripe unavailable"}}`}}},
		{"a failed retry", []fakeAnswer{{400, missing("customer", "cus_1")}, {500, `{"error":{"type":"api_error","message":"still broken"}}`}}},
	}
	for _, tt := range failures {
		t.Run(tt.name+" is STRIPE_CHECKOUT_SESSION_FAILED", func(t *testing.T) {
			gateway, fake := newTestGateway(t)
			for _, answer := range tt.answers {
				fake.answer("POST /v1/checkout/sessions", answer.status, answer.body)
			}

			_, err := gateway.CreateCheckoutSession(context.Background(), checkoutRequest())
			if !domain.HasCode(err, domain.CodeStripeCheckoutSessionFailed) {
				t.Errorf("err = %v", err)
			}
		})
	}
}

func TestCreateBillingPortalSession(t *testing.T) {
	tests := []struct {
		name     string
		answer   fakeAnswer
		wantURL  string
		wantCode string
	}{
		{name: "the portal url", answer: fakeAnswer{200, `{"id":"bps_1","url":"https://portal.stripe.com"}`}, wantURL: "https://portal.stripe.com"},
		{name: "a customer that is gone", answer: fakeAnswer{404, missing("customer", "cus_1")}},
		{name: "an unrelated failure", answer: fakeAnswer{500, `{"error":{"type":"api_error"}}`}, wantCode: domain.CodeStripeBillingPortalFailed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gateway, fake := newTestGateway(t)
			fake.answer("POST /v1/billing_portal/sessions", tt.answer.status, tt.answer.body)

			url, err := gateway.CreateBillingPortalSession(context.Background(), "cus_1", "https://app.example.com")
			if tt.wantCode != "" {
				if !domain.HasCode(err, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil || url != tt.wantURL {
				t.Fatalf("url = %q, %v", url, err)
			}
			if form := fake.calls[0].form; form.Get("customer") != "cus_1" || form.Get("return_url") != "https://app.example.com" {
				t.Errorf("form = %v", form)
			}
		})
	}
}

func TestRetrieveSubscription(t *testing.T) {
	t.Run("reads the subscription", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("GET /v1/subscriptions/sub_1", 200, subscriptionOn("price_pro", 4))

		subscription, err := gateway.RetrieveSubscription(context.Background(), "sub_1")
		if err != nil {
			t.Fatal(err)
		}
		item := subscription.Items[0]
		if subscription.ID != "sub_1" || subscription.Status != "active" || subscription.CustomerID != "cus_remote" ||
			item.PriceID != "price_pro" || item.Quantity != 4 || item.CurrentPeriodEnd.Unix() != 1769904000 {
			t.Errorf("subscription = %+v", subscription)
		}
		if subscription.CancelAt != nil || subscription.TrialEnd != nil {
			t.Errorf("empty dates were read as %v %v", subscription.CancelAt, subscription.TrialEnd)
		}
	})

	t.Run("a subscription that is gone is nil", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("GET /v1/subscriptions/sub_1", 404, missing("subscription", "sub_1"))

		subscription, err := gateway.RetrieveSubscription(context.Background(), "sub_1")
		if err != nil || subscription != nil {
			t.Fatalf("RetrieveSubscription = %+v, %v", subscription, err)
		}
	})

	t.Run("an unrelated failure is STRIPE_SUBSCRIPTION_LOOKUP_FAILED", func(t *testing.T) {
		gateway, fake := newTestGateway(t)
		fake.answer("GET /v1/subscriptions/sub_1", 500, `{"error":{"type":"api_error"}}`)

		if _, err := gateway.RetrieveSubscription(context.Background(), "sub_1"); !domain.HasCode(err, domain.CodeStripeSubscriptionLookupFailed) {
			t.Errorf("err = %v", err)
		}
	})

	t.Run("without a secret key every call fails", func(t *testing.T) {
		gateway := NewStripeGateway("", "whsec_test")

		if _, err := gateway.RetrieveSubscription(context.Background(), "sub_1"); !domain.HasCode(err, domain.CodeStripeSubscriptionLookupFailed) {
			t.Errorf("err = %v", err)
		}
	})
}

func TestCancelSubscription(t *testing.T) {
	gateway, fake := newTestGateway(t)
	fake.answer("DELETE /v1/subscriptions/sub_1", 200, `{"id":"sub_1","status":"canceled"}`)
	fake.answer("DELETE /v1/subscriptions/sub_gone", 404, missing("subscription", "sub_gone"))
	fake.answer("DELETE /v1/subscriptions/sub_err", 500, `{"error":{"type":"api_error"}}`)

	if cancelled, err := gateway.CancelSubscription(context.Background(), "sub_1"); err != nil || !cancelled {
		t.Errorf("cancel sub_1 = %v, %v", cancelled, err)
	}
	if cancelled, err := gateway.CancelSubscription(context.Background(), "sub_gone"); err != nil || cancelled {
		t.Errorf("cancel sub_gone = %v, %v", cancelled, err)
	}
	if _, err := gateway.CancelSubscription(context.Background(), "sub_err"); !domain.HasCode(err, domain.CodeStripeSubscriptionCancelFailed) {
		t.Errorf("cancel sub_err = %v", err)
	}
}

func signed(payload string, secret string) string {
	return webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{Payload: []byte(payload), Secret: secret}).Header
}

func TestParseWebhook(t *testing.T) {
	const checkoutEvent = `{"id":"evt_1","object":"event","api_version":"2026-08-26.dahlia","type":"checkout.session.completed",
		"data":{"object":{"id":"cs_1","object":"checkout.session","mode":"subscription","customer":"cus_1","subscription":"sub_1",
		"client_reference_id":"establishment-1","metadata":{"establishmentId":"establishment-1"}}}}`

	t.Run("the checks of StripeWebhookGuard", func(t *testing.T) {
		tests := []struct {
			name      string
			gateway   *StripeGateway
			signature string
			wantCode  string
		}{
			{"no webhook secret", NewStripeGateway("sk_test", ""), "t=1,v1=x", domain.CodeStripeWebhookSecretNotConfigured},
			{"no signature", NewStripeGateway("sk_test", "whsec_test"), "", domain.CodeStripeWebhookSignatureMissing},
			{"a wrong signature", NewStripeGateway("sk_test", "whsec_test"), signed(checkoutEvent, "whsec_other"), domain.CodeStripeWebhookSignatureInvalid},
			{"no secret key", NewStripeGateway("", "whsec_test"), signed(checkoutEvent, "whsec_test"), domain.CodeStripeWebhookSignatureInvalid},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				_, err := tt.gateway.ParseWebhook([]byte(checkoutEvent), tt.signature)
				if !domain.HasCode(err, tt.wantCode) {
					t.Errorf("err = %v, want %s", err, tt.wantCode)
				}
			})
		}
	})

	gateway := NewStripeGateway("sk_test", "whsec_test")

	t.Run("a checkout session", func(t *testing.T) {
		event, err := gateway.ParseWebhook([]byte(checkoutEvent), signed(checkoutEvent, "whsec_test"))
		if err != nil {
			t.Fatal(err)
		}
		session := event.CheckoutSession
		if event.Type != domain.StripeEventCheckoutCompleted || session == nil || session.Mode != "subscription" ||
			session.CustomerID != "cus_1" || session.SubscriptionID != "sub_1" || session.ClientReferenceID != "establishment-1" ||
			session.Metadata["establishmentId"] != "establishment-1" {
			t.Errorf("event = %+v, session = %+v", event, session)
		}
	})

	t.Run("a subscription from another API version", func(t *testing.T) {
		payload := `{"id":"evt_2","object":"event","api_version":"2025-01-27.acacia","type":"customer.subscription.updated",
			"data":{"object":{"id":"sub_1","object":"subscription","status":"active","customer":"cus_1","cancel_at_period_end":true,
			"cancel_at":1769904000,"metadata":{"establishmentId":"establishment-1"},
			"items":{"object":"list","data":[{"id":"si_1","quantity":2,"price":{"id":"price_pro"}}]}}}}`

		event, err := gateway.ParseWebhook([]byte(payload), signed(payload, "whsec_test"))
		if err != nil {
			t.Fatal(err)
		}
		subscription := event.Subscription
		if subscription == nil || subscription.CustomerID != "cus_1" || !subscription.CancelAtPeriodEnd ||
			subscription.CancelAt.Unix() != 1769904000 || subscription.Items[0].Quantity != 2 {
			t.Errorf("subscription = %+v", subscription)
		}
	})

	t.Run("an invoice", func(t *testing.T) {
		payload := `{"id":"evt_3","object":"event","api_version":"2026-08-26.dahlia","type":"invoice.payment_failed",
			"data":{"object":{"id":"in_1","object":"invoice","customer":"cus_1",
			"parent":{"type":"subscription_details","subscription_details":{"subscription":"sub_1"}}}}}`

		event, err := gateway.ParseWebhook([]byte(payload), signed(payload, "whsec_test"))
		if err != nil {
			t.Fatal(err)
		}
		if invoice := event.Invoice; invoice == nil || invoice.ID != "in_1" || invoice.CustomerID != "cus_1" || invoice.SubscriptionID != "sub_1" {
			t.Errorf("invoice = %+v", event.Invoice)
		}
	})

	t.Run("an event the service does not handle", func(t *testing.T) {
		payload := `{"id":"evt_4","object":"event","api_version":"2026-08-26.dahlia","type":"customer.created","data":{"object":{"id":"cus_1"}}}`

		event, err := gateway.ParseWebhook([]byte(payload), signed(payload, "whsec_test"))
		if err != nil || event.Type != "customer.created" || event.CheckoutSession != nil || event.Subscription != nil || event.Invoice != nil {
			t.Fatalf("event = %+v, %v", event, err)
		}
	})
}

func TestDescribe(t *testing.T) {
	described := describe(&stripe.Error{Type: "invalid_request_error", Code: "parameter_invalid_empty", Param: "line_items[0][price]", Msg: "No such price"})
	for _, part := range []string{"invalid_request_error", "param=line_items[0][price]", "No such price"} {
		if !strings.Contains(described, part) {
			t.Errorf("%q does not say %q", described, part)
		}
	}

	if describe(&stripe.Error{}) != "no details" {
		t.Errorf("an empty Stripe error = %q", describe(&stripe.Error{}))
	}
}
