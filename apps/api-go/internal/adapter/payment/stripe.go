package payment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v86"
	"github.com/stripe/stripe-go/v86/webhook"

	"api-go/internal/core/domain"
)

type StripeGateway struct {
	client        *stripe.Client
	configured    bool
	webhookSecret string
}

func NewStripeGateway(secretKey, webhookSecret string) *StripeGateway {
	return newStripeGateway(secretKey, webhookSecret, stripe.NewBackendsWithConfig(&stripe.BackendConfig{}))
}

func newStripeGateway(secretKey, webhookSecret string, backends *stripe.Backends) *StripeGateway {
	return &StripeGateway{
		client:        stripe.NewClient(secretKey, stripe.WithBackends(backends)),
		configured:    secretKey != "",
		webhookSecret: webhookSecret,
	}
}

var errNotConfigured = errors.New("STRIPE_SECRET_KEY is not configured in environment variables")

func (g *StripeGateway) CreateCheckoutSession(ctx context.Context, request domain.CheckoutRequest) (*domain.StripeCheckoutSession, error) {
	session, err := g.createCheckoutSession(ctx, request, request.CustomerID, request.IdempotencyKey)
	if err == nil {
		return session, nil
	}

	if request.CustomerID == "" || !isResourceMissing(err, "customer") {
		slog.Error("Stripe checkout session creation failed", "error", describe(err))
		return nil, domain.Internal(domain.CodeStripeCheckoutSessionFailed)
	}

	slog.Warn("the Stripe customer is missing; retrying Checkout without a customer", "customerId", request.CustomerID)

	retryKey := ""
	if request.IdempotencyKey != "" {
		retryKey = request.IdempotencyKey + ":no-customer"
	}

	session, err = g.createCheckoutSession(ctx, request, "", retryKey)
	if err != nil {
		slog.Error("Stripe checkout session retry failed", "error", describe(err))
		return nil, domain.Internal(domain.CodeStripeCheckoutSessionFailed)
	}

	return session, nil
}

func (g *StripeGateway) createCheckoutSession(ctx context.Context, request domain.CheckoutRequest, customerID, idempotencyKey string) (*domain.StripeCheckoutSession, error) {
	if !g.configured {
		return nil, errNotConfigured
	}

	params := &stripe.CheckoutSessionCreateParams{
		Mode:                     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL:               stripe.String(request.SuccessURL),
		CancelURL:                stripe.String(request.CancelURL),
		ClientReferenceID:        stripe.String(request.ClientReferenceID),
		AllowPromotionCodes:      stripe.Bool(true),
		AutomaticTax:             &stripe.CheckoutSessionCreateAutomaticTaxParams{Enabled: stripe.Bool(true)},
		BillingAddressCollection: stripe.String("required"),
		TaxIDCollection:          &stripe.CheckoutSessionCreateTaxIDCollectionParams{Enabled: stripe.Bool(true)},
		ExpiresAt:                stripe.Int64(request.ExpiresAt.Unix()),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{Price: stripe.String(request.PriceID), Quantity: stripe.Int64(int64(request.Quantity))},
		},
		IntegrationIdentifier: stripe.String(request.IntegrationIdentifier),
		Metadata:              maps.Clone(request.Metadata),
		SubscriptionData:      &stripe.CheckoutSessionCreateSubscriptionDataParams{Metadata: maps.Clone(request.Metadata)},
	}

	if customerID != "" {
		params.Customer = stripe.String(customerID)
		params.CustomerUpdate = &stripe.CheckoutSessionCreateCustomerUpdateParams{Address: stripe.String("auto")}
	}

	if idempotencyKey != "" {
		params.SetIdempotencyKey(idempotencyKey)
	}

	session, err := g.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return nil, err
	}

	return toCheckoutSession(session), nil
}

func (g *StripeGateway) CancelSubscription(ctx context.Context, subscriptionID string) (bool, error) {
	err := errNotConfigured
	if g.configured {
		_, err = g.client.V1Subscriptions.Cancel(ctx, subscriptionID, nil)
	}

	if err == nil {
		return true, nil
	}
	if isResourceMissing(err, "subscription") {
		return false, nil
	}

	slog.Error("could not cancel the Stripe subscription", "subscriptionId", subscriptionID, "error", describe(err))
	return false, domain.Internal(domain.CodeStripeSubscriptionCancelFailed)
}

func (g *StripeGateway) CreateBillingPortalSession(ctx context.Context, customerID, returnURL string) (string, error) {
	err := errNotConfigured
	var session *stripe.BillingPortalSession
	if g.configured {
		session, err = g.client.V1BillingPortalSessions.Create(ctx, &stripe.BillingPortalSessionCreateParams{
			Customer:  stripe.String(customerID),
			ReturnURL: stripe.String(returnURL),
		})
	}

	if err == nil {
		return session.URL, nil
	}
	if isResourceMissing(err, "customer") {
		return "", nil
	}

	slog.Error("Stripe billing portal session creation failed", "customerId", customerID, "error", describe(err))
	return "", domain.Internal(domain.CodeStripeBillingPortalFailed)
}

func (g *StripeGateway) RetrieveSubscription(ctx context.Context, subscriptionID string) (*domain.StripeSubscription, error) {
	subscription, err := g.retrieve(ctx, subscriptionID)
	if err != nil {
		return nil, err
	}
	if subscription == nil {
		return nil, nil
	}

	return toSubscription(subscription), nil
}

func (g *StripeGateway) retrieve(ctx context.Context, subscriptionID string) (*stripe.Subscription, error) {
	err := errNotConfigured
	var subscription *stripe.Subscription
	if g.configured {
		subscription, err = g.client.V1Subscriptions.Retrieve(ctx, subscriptionID, nil)
	}

	if err == nil {
		return subscription, nil
	}
	if isResourceMissing(err, "subscription") {
		return nil, nil
	}

	slog.Error("could not retrieve the Stripe subscription", "subscriptionId", subscriptionID, "error", describe(err))
	return nil, domain.Internal(domain.CodeStripeSubscriptionLookupFailed)
}

func (g *StripeGateway) UpdateSubscriptionSeats(ctx context.Context, subscriptionID string, seats int, priceID string) (bool, error) {
	subscription, err := g.retrieve(ctx, subscriptionID)
	if err != nil {
		return false, err
	}

	var item *stripe.SubscriptionItem
	if subscription != nil && subscription.Items != nil {
		for _, candidate := range subscription.Items.Data {
			if candidate.Price != nil && candidate.Price.ID == priceID {
				item = candidate
				break
			}
		}
	}

	if item == nil {
		slog.Warn("the subscription has no item on the seat price: leaving its quantity alone",
			"subscriptionId", subscriptionID, "priceId", priceID)
		return false, nil
	}

	if item.Quantity == int64(seats) {
		return false, nil
	}

	_, err = g.client.V1Subscriptions.Update(ctx, subscriptionID, &stripe.SubscriptionUpdateParams{
		Items:             []*stripe.SubscriptionUpdateItemParams{{ID: stripe.String(item.ID), Quantity: stripe.Int64(int64(seats))}},
		ProrationBehavior: stripe.String("create_prorations"),
	})
	if err != nil {
		slog.Error("could not change the seats of the subscription", "subscriptionId", subscriptionID, "seats", seats, "error", describe(err))
		return false, domain.Internal(domain.CodeStripeSubscriptionSeatsUpdateFailed)
	}

	return true, nil
}

func (g *StripeGateway) ParseWebhook(payload []byte, signature string) (*domain.StripeEvent, error) {
	if g.webhookSecret == "" {
		slog.Error("STRIPE_WEBHOOK_SECRET is not configured in environment variables")
		return nil, domain.Internal(domain.CodeStripeWebhookSecretNotConfigured)
	}

	if signature == "" {
		slog.Warn("Stripe webhook request missing stripe-signature header")
		return nil, domain.BadRequest(domain.CodeStripeWebhookSignatureMissing)
	}

	err := errNotConfigured
	var event stripe.Event
	if g.configured {
		event, err = webhook.ConstructEventWithOptions(payload, signature, g.webhookSecret,
			webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true})
	}
	if err != nil {
		slog.Warn("Stripe webhook signature verification failed", "error", err)
		return nil, domain.BadRequest(domain.CodeStripeWebhookSignatureInvalid)
	}

	return toEvent(event)
}

func toEvent(event stripe.Event) (*domain.StripeEvent, error) {
	parsed := &domain.StripeEvent{ID: event.ID, Type: string(event.Type)}

	var raw json.RawMessage
	if event.Data != nil {
		raw = event.Data.Raw
	}

	switch parsed.Type {
	case domain.StripeEventCheckoutCompleted:
		var session stripe.CheckoutSession
		if err := json.Unmarshal(raw, &session); err != nil {
			return nil, fmt.Errorf("reading the checkout session of event %s: %w", event.ID, err)
		}
		parsed.CheckoutSession = toCheckoutSession(&session)
	case domain.StripeEventSubscriptionCreated,
		domain.StripeEventSubscriptionUpdated,
		domain.StripeEventSubscriptionDeleted,
		domain.StripeEventSubscriptionPaused,
		domain.StripeEventSubscriptionResumed:
		var subscription stripe.Subscription
		if err := json.Unmarshal(raw, &subscription); err != nil {
			return nil, fmt.Errorf("reading the subscription of event %s: %w", event.ID, err)
		}
		parsed.Subscription = toSubscription(&subscription)
	case domain.StripeEventInvoicePaid, domain.StripeEventInvoicePaymentFailed:
		var invoice stripe.Invoice
		if err := json.Unmarshal(raw, &invoice); err != nil {
			return nil, fmt.Errorf("reading the invoice of event %s: %w", event.ID, err)
		}
		parsed.Invoice = toInvoice(&invoice)
	}

	return parsed, nil
}

func toCheckoutSession(session *stripe.CheckoutSession) *domain.StripeCheckoutSession {
	converted := &domain.StripeCheckoutSession{
		ID:                session.ID,
		URL:               session.URL,
		Mode:              string(session.Mode),
		ClientReferenceID: session.ClientReferenceID,
		Metadata:          session.Metadata,
	}
	if session.Customer != nil {
		converted.CustomerID = session.Customer.ID
	}
	if session.Subscription != nil {
		converted.SubscriptionID = session.Subscription.ID
	}
	return converted
}

func toSubscription(subscription *stripe.Subscription) *domain.StripeSubscription {
	converted := &domain.StripeSubscription{
		ID:                subscription.ID,
		Status:            string(subscription.Status),
		Metadata:          subscription.Metadata,
		CancelAtPeriodEnd: subscription.CancelAtPeriodEnd,
		CancelAt:          fromUnix(subscription.CancelAt),
		TrialEnd:          fromUnix(subscription.TrialEnd),
		CanceledAt:        fromUnix(subscription.CanceledAt),
	}
	if subscription.Customer != nil {
		converted.CustomerID = subscription.Customer.ID
	}
	if subscription.Items != nil {
		for _, item := range subscription.Items.Data {
			convertedItem := domain.StripeSubscriptionItem{
				ID:                 item.ID,
				Quantity:           int(item.Quantity),
				CurrentPeriodStart: fromUnix(item.CurrentPeriodStart),
				CurrentPeriodEnd:   fromUnix(item.CurrentPeriodEnd),
			}
			if item.Price != nil {
				convertedItem.PriceID = item.Price.ID
			}
			converted.Items = append(converted.Items, convertedItem)
		}
	}
	return converted
}

func toInvoice(invoice *stripe.Invoice) *domain.StripeInvoice {
	converted := &domain.StripeInvoice{ID: invoice.ID}
	if invoice.Customer != nil {
		converted.CustomerID = invoice.Customer.ID
	}
	if invoice.Parent != nil && invoice.Parent.SubscriptionDetails != nil && invoice.Parent.SubscriptionDetails.Subscription != nil {
		converted.SubscriptionID = invoice.Parent.SubscriptionDetails.Subscription.ID
	}
	return converted
}

func fromUnix(seconds int64) *time.Time {
	if seconds == 0 {
		return nil
	}
	t := time.Unix(seconds, 0).UTC()
	return &t
}

func isResourceMissing(err error, resource string) bool {
	var stripeErr *stripe.Error
	if !errors.As(err, &stripeErr) || stripeErr.Code != stripe.ErrorCodeResourceMissing {
		return false
	}

	return strings.Contains(strings.ToLower(stripeErr.Param), resource) ||
		strings.Contains(strings.ToLower(stripeErr.Msg), "no such "+resource)
}

func describe(err error) string {
	var stripeErr *stripe.Error
	if !errors.As(err, &stripeErr) {
		return err.Error()
	}

	var parts []string
	for _, part := range []string{string(stripeErr.Type), string(stripeErr.Code)} {
		if part != "" {
			parts = append(parts, part)
		}
	}
	if stripeErr.Param != "" {
		parts = append(parts, "param="+stripeErr.Param)
	}
	if stripeErr.Msg != "" {
		parts = append(parts, stripeErr.Msg)
	}
	if len(parts) == 0 {
		return "no details"
	}

	return strings.Join(parts, " · ")
}
