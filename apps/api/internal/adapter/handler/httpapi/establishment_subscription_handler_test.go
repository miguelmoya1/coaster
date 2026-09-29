package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stripe/stripe-go/v86/webhook"

	"coaster-api/internal/adapter/payment"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

type emptyBilling struct{}

func (emptyBilling) FindByEstablishmentID(context.Context, string) (*domain.EstablishmentSubscription, error) {
	return nil, nil
}

func (emptyBilling) FindByStripeCustomerID(context.Context, string) (*domain.EstablishmentSubscription, error) {
	return nil, nil
}

func (emptyBilling) FindByStripeSubscriptionID(context.Context, string) (*domain.EstablishmentSubscription, error) {
	return nil, nil
}

func (emptyBilling) CountBillableSeats(context.Context, string) (int, error) { return 1, nil }

func (emptyBilling) UpdateStatus(context.Context, string, domain.SubscriptionStatus) error {
	return nil
}

func (emptyBilling) Upsert(context.Context, string, domain.SubscriptionUpsert) error { return nil }

func (emptyBilling) UpdateFromStripe(context.Context, string, domain.SubscriptionSnapshot) error {
	return nil
}

func newBillingServer(role domain.EstablishmentRole) http.Handler {
	subscriptions := service.NewSubscriptionService(service.SubscriptionDependencies{
		Repo:     emptyBilling{},
		Payments: payment.NewStripeGateway("sk_test_123", "whsec_test"),
		Billing:  service.BillingConfig{PricePro: "price_pro", BasePriceCents: 1999, IncludedSeats: 10, ExtraSeatPriceCents: 200},
	})

	guard := testGuard(fakeAccess{role: role})
	mux := http.NewServeMux()
	NewEstablishmentSubscriptionHandler(subscriptions).RegisterRoutes(mux, guard)
	NewStripeWebhookHandler(subscriptions).RegisterRoutes(mux, guard)
	return mux
}

func TestEstablishmentSubscriptionRoutes(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	base := "/api/v1/establishments/e1/establishment-subscription"

	tests := []struct {
		name       string
		role       domain.EstablishmentRole
		method     string
		target     string
		body       string
		headers    map[string]string
		wantStatus int
		wantBody   string
	}{
		{
			name: "any member reads the subscription", role: domain.EstablishmentRoleStaff, method: "GET", target: base, headers: signedIn,
			wantStatus: http.StatusOK,
		},
		{
			name: "any member reads the seats", role: domain.EstablishmentRoleStaff, method: "GET", target: base + "/seats", headers: signedIn,
			wantStatus: http.StatusOK,
			wantBody:   `{"used":1,"billed":0,"included":10,"basePriceCents":1999,"extraPriceCents":200}`,
		},
		{
			name: "reading needs a session", role: domain.EstablishmentRoleOwner, method: "GET", target: base,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "billing is only for who manages it", role: domain.EstablishmentRoleStaff, method: "POST", target: base + "/customer-portal-session",
			headers: signedIn, wantStatus: http.StatusForbidden,
		},
		{
			name: "an unknown plan", role: domain.EstablishmentRoleOwner, method: "POST", target: base + "/checkout-session",
			body: `{"plan":"FREE"}`, headers: signedIn, wantStatus: http.StatusBadRequest,
			wantBody: `{"message":["INVALID_SUBSCRIPTION_PLAN"],"error":"Bad Request","statusCode":400}`,
		},
		{
			name: "a portal without a customer", role: domain.EstablishmentRoleOwner, method: "POST", target: base + "/customer-portal-session",
			headers: signedIn, wantStatus: http.StatusBadRequest,
			wantBody: `{"message":"STRIPE_CUSTOMER_NOT_FOUND","error":"Bad Request","statusCode":400}`,
		},
		{
			name: "the portal refuses unknown properties", role: domain.EstablishmentRoleOwner, method: "POST", target: base + "/customer-portal-session",
			body: `{"x":1}`, headers: signedIn, wantStatus: http.StatusBadRequest,
			wantBody: `{"message":["property x should not exist"],"error":"Bad Request","statusCode":400}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := send(newBillingServer(tt.role), tt.method, tt.target, tt.body, tt.headers)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body)
			}
			if tt.wantBody != "" && response.Body.String() != tt.wantBody {
				t.Errorf("body = %s, want %s", response.Body, tt.wantBody)
			}
		})
	}
}

func TestStripeWebhookRoute(t *testing.T) {
	const unhandled = `{"id":"evt_1","object":"event","api_version":"2026-08-26.dahlia","type":"customer.created","data":{"object":{"id":"cus_1"}}}`
	signature := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{Payload: []byte(unhandled), Secret: "whsec_test"}).Header

	tests := []struct {
		name       string
		signature  string
		wantStatus int
		wantBody   string
	}{
		{"a verified event", signature, http.StatusCreated, `{"received":true}`},
		{"no signature", "", http.StatusBadRequest, `{"message":"STRIPE_WEBHOOK_SIGNATURE_MISSING","error":"Bad Request","statusCode":400}`},
		{"a wrong signature", "t=1,v1=bad", http.StatusBadRequest, `{"message":"STRIPE_WEBHOOK_SIGNATURE_INVALID","error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			headers := map[string]string{}
			if tt.signature != "" {
				headers["Stripe-Signature"] = tt.signature
			}

			response := send(newBillingServer(domain.EstablishmentRoleOwner), "POST", "/api/v1/stripe/webhook", unhandled, headers)
			if response.Code != tt.wantStatus || response.Body.String() != tt.wantBody {
				t.Errorf("response = %d %s, want %d %s", response.Code, response.Body, tt.wantStatus, tt.wantBody)
			}
		})
	}
}

func TestFreeSubscriptionResponse(t *testing.T) {
	response := send(newBillingServer(domain.EstablishmentRoleStaff), "GET", "/api/v1/establishments/e1/establishment-subscription", "",
		map[string]string{"Authorization": "Bearer good"})

	var body map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["plan"] != "FREE" || body["status"] != "INACTIVE" || body["id"] != "" || body["establishmentId"] != "e1" || body["manualGrant"] != nil {
		t.Errorf("body = %v", body)
	}
}
