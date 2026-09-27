package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// SubscriptionService is establishment-subscription in Nest: what an establishment pays
// for, Checkout and the customer portal, the Stripe webhooks and the seats Stripe bills.
type SubscriptionService struct {
	repo     ports.EstablishmentSubscriptionRepository
	payments ports.PaymentGateway
	cache    ports.Cache
	events   ports.EventPublisher
	realtime ports.Realtime
	billing  BillingConfig
	now      func() time.Time
}

// SubscriptionDependencies is what NewSubscriptionService needs.
type SubscriptionDependencies struct {
	Repo     ports.EstablishmentSubscriptionRepository
	Payments ports.PaymentGateway
	Cache    ports.Cache
	Events   ports.EventPublisher
	Realtime ports.Realtime
	Billing  BillingConfig
}

func NewSubscriptionService(deps SubscriptionDependencies) *SubscriptionService {
	return &SubscriptionService{
		repo:     deps.Repo,
		payments: deps.Payments,
		cache:    deps.Cache,
		events:   deps.Events,
		realtime: deps.Realtime,
		billing:  deps.Billing,
		now:      time.Now,
	}
}

// Find is the establishment's subscription. One that never subscribed is FREE; one whose
// period ran out is checked against Stripe first, in case a renewal webhook was missed.
func (s *SubscriptionService) Find(ctx context.Context, establishmentID string) (domain.EstablishmentSubscriptionView, error) {
	subscription, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return domain.EstablishmentSubscriptionView{}, err
	}

	if subscription == nil {
		slog.Debug("no subscription stored, returning the default FREE plan", "establishmentId", establishmentID)
		return domain.FreeSubscriptionView(establishmentID, s.now()), nil
	}

	if s.looksLapsed(subscription) {
		if _, err := s.Refresh(ctx, establishmentID); err != nil {
			return domain.EstablishmentSubscriptionView{}, err
		}

		refreshed, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
		if err != nil {
			return domain.EstablishmentSubscriptionView{}, err
		}
		if refreshed != nil {
			subscription = refreshed
		}
	}

	return subscription.View(s.now()), nil
}

func (s *SubscriptionService) looksLapsed(subscription *domain.EstablishmentSubscription) bool {
	return subscription.HasStripeSubscription() && subscription.CurrentPeriodEnd != nil &&
		subscription.CurrentPeriodEnd.Before(s.now())
}

// Seats compares the staff with the seats Stripe is billing.
func (s *SubscriptionService) Seats(ctx context.Context, establishmentID string) (domain.SubscriptionSeats, error) {
	used, err := s.repo.CountBillableSeats(ctx, establishmentID)
	if err != nil {
		return domain.SubscriptionSeats{}, err
	}

	subscription, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return domain.SubscriptionSeats{}, err
	}

	billed := 0
	if subscription != nil {
		billed = subscription.Seats
	}

	return domain.SubscriptionSeats{
		Used:            used,
		Billed:          billed,
		Included:        s.billing.includedSeats(),
		BasePriceCents:  s.billing.basePriceCents(),
		ExtraPriceCents: s.billing.extraSeatPriceCents(),
	}, nil
}

// Refresh asks Stripe about the establishment's subscription and stores what it says. It is
// the ports.SubscriptionRefresher of the route checks. Without a Stripe subscription, or
// when Stripe no longer knows it, the stored state stands.
func (s *SubscriptionService) Refresh(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error) {
	stored, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil || stored == nil {
		return nil, err
	}

	if !stored.HasStripeSubscription() {
		return stored.State(), nil
	}

	remote, err := s.payments.RetrieveSubscription(ctx, *stored.StripeSubscriptionID)
	if err != nil {
		return nil, err
	}
	if remote == nil {
		return stored.State(), nil
	}

	snapshot := s.billing.snapshot(remote)

	slog.Warn("the stored subscription disagreed with Stripe and was refreshed",
		"establishmentId", establishmentID, "from", stored.Status, "to", snapshot.Status)

	if err := s.repo.UpdateFromStripe(ctx, establishmentID, snapshot); err != nil {
		return nil, err
	}
	s.cache.Forget(ctx, subscriptionCacheKey(establishmentID))

	refreshed, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil || refreshed == nil {
		return nil, err
	}

	return refreshed.State(), nil
}

// CreateCheckoutSession opens a Stripe Checkout for plan, billing one seat per member.
// It refuses while the establishment already has a live subscription.
func (s *SubscriptionService) CreateCheckoutSession(ctx context.Context, establishmentID string, plan domain.SubscriptionPlan) (domain.CheckoutSession, error) {
	existing, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return domain.CheckoutSession{}, err
	}

	now := s.now()
	hasStripeSubscription := existing.HasStripeSubscription()
	isCanceled := existing != nil && existing.Status == domain.SubscriptionCanceled
	isPendingCancellation := isCanceled && existing.CurrentPeriodEnd != nil && !now.After(*existing.CurrentPeriodEnd)
	isTerminalCancellation := isCanceled && !isPendingCancellation

	if hasStripeSubscription && !isTerminalCancellation {
		remote, err := s.payments.RetrieveSubscription(ctx, *existing.StripeSubscriptionID)
		if err != nil {
			return domain.CheckoutSession{}, err
		}

		if remote != nil {
			if isPendingCancellation {
				slog.Warn("the establishment has a subscription pending cancellation", "establishmentId", establishmentID)
				return domain.CheckoutSession{}, domain.BadRequest(domain.CodeStripeSubscriptionPendingCancellation)
			}

			slog.Warn("the establishment already has a Stripe subscription",
				"establishmentId", establishmentID, "subscriptionId", *existing.StripeSubscriptionID)
			return domain.CheckoutSession{}, domain.BadRequest(domain.CodeStripeSubscriptionAlreadyExists)
		}

		slog.Warn("ignoring a stale Stripe subscription reference",
			"establishmentId", establishmentID, "subscriptionId", *existing.StripeSubscriptionID)
	}

	if isPendingCancellation && !hasStripeSubscription {
		slog.Warn("the establishment has a subscription pending cancellation", "establishmentId", establishmentID)
		return domain.CheckoutSession{}, domain.BadRequest(domain.CodeStripeSubscriptionPendingCancellation)
	}

	priceID, err := s.billing.priceID(plan)
	if err != nil {
		return domain.CheckoutSession{}, err
	}

	seats, err := s.repo.CountBillableSeats(ctx, establishmentID)
	if err != nil {
		return domain.CheckoutSession{}, err
	}

	bucket := checkoutBucket(now)
	idempotencyKey := fmt.Sprintf("checkout:%s:%s:%d:%d", establishmentID, plan, seats, bucket)

	customerID := ""
	if existing != nil && existing.StripeCustomerID != nil {
		customerID = *existing.StripeCustomerID
	}

	session, err := s.payments.CreateCheckoutSession(ctx, domain.CheckoutRequest{
		SuccessURL:            s.billing.checkoutSuccessURL(establishmentID),
		CancelURL:             s.billing.checkoutCancelURL(establishmentID),
		ClientReferenceID:     establishmentID,
		PriceID:               priceID,
		Quantity:              seats,
		ExpiresAt:             checkoutExpiry(bucket),
		IntegrationIdentifier: integrationIdentifier(idempotencyKey),
		Metadata:              map[string]string{"establishmentId": establishmentID, "plan": string(plan)},
		CustomerID:            customerID,
		IdempotencyKey:        idempotencyKey,
	})
	if err != nil {
		return domain.CheckoutSession{}, err
	}

	if session.URL == "" {
		slog.Error("Stripe created a checkout session without a URL", "establishmentId", establishmentID)
		return domain.CheckoutSession{}, domain.Internal(domain.CodeStripeCheckoutSessionFailed)
	}

	return domain.CheckoutSession{ID: session.ID, URL: session.URL}, nil
}

// CreateCustomerPortalSession opens Stripe's customer portal. When the stored customer is
// gone, it tries the customer of the stored subscription before giving up.
func (s *SubscriptionService) CreateCustomerPortalSession(ctx context.Context, establishmentID string) (domain.PortalSession, error) {
	subscription, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return domain.PortalSession{}, err
	}

	if subscription == nil || subscription.StripeCustomerID == nil || *subscription.StripeCustomerID == "" {
		slog.Warn("no Stripe customer for the customer portal", "establishmentId", establishmentID)
		return domain.PortalSession{}, domain.BadRequest(domain.CodeStripeCustomerNotFound)
	}

	storedCustomerID := *subscription.StripeCustomerID
	returnURL := s.billing.dashboardURL(establishmentID)

	url, err := s.payments.CreateBillingPortalSession(ctx, storedCustomerID, returnURL)
	if err != nil {
		return domain.PortalSession{}, err
	}
	if url != "" {
		return domain.PortalSession{URL: url}, nil
	}

	remoteCustomerID := ""
	if subscription.HasStripeSubscription() {
		remote, err := s.payments.RetrieveSubscription(ctx, *subscription.StripeSubscriptionID)
		if err != nil {
			return domain.PortalSession{}, err
		}
		if remote != nil {
			remoteCustomerID = remote.CustomerID
		}
	}

	if remoteCustomerID != "" && remoteCustomerID != storedCustomerID {
		url, err := s.payments.CreateBillingPortalSession(ctx, remoteCustomerID, returnURL)
		if err != nil {
			return domain.PortalSession{}, err
		}
		if url != "" {
			return domain.PortalSession{URL: url}, nil
		}
	}

	slog.Warn("the Stripe customer is no longer available", "establishmentId", establishmentID, "customerId", storedCustomerID)
	return domain.PortalSession{}, domain.BadRequest(domain.CodeStripeCustomerNotFound)
}

// SyncSeats tells Stripe how many members the establishment has now, so the next invoice
// bills them. It does nothing without a Stripe subscription or when the count is the same.
func (s *SubscriptionService) SyncSeats(ctx context.Context, establishmentID string) error {
	subscription, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return err
	}

	if !subscription.HasStripeSubscription() {
		slog.Debug("no Stripe subscription: nothing to bill by seat", "establishmentId", establishmentID)
		return nil
	}

	seats, err := s.repo.CountBillableSeats(ctx, establishmentID)
	if err != nil {
		return err
	}

	if seats == subscription.Seats {
		return nil
	}

	if s.billing.PricePro == "" {
		slog.Error("STRIPE_PRICE_PRO is not configured: the establishment keeps its seats",
			"establishmentId", establishmentID, "seats", subscription.Seats)
		return nil
	}

	_, err = s.payments.UpdateSubscriptionSeats(ctx, *subscription.StripeSubscriptionID, seats, s.billing.PricePro)
	return err
}

// SyncSeatsOnMemberChange is SyncSeats for the member events. The member was already added
// or removed, so a failure is only logged.
func (s *SubscriptionService) SyncSeatsOnMemberChange(ctx context.Context, establishmentID string) {
	if err := s.SyncSeats(ctx, establishmentID); err != nil {
		slog.Error("the staff changed but Stripe was not told: it keeps billing the old number of seats until the next change; check it by hand",
			"establishmentId", establishmentID, "error", err)
	}
}

// ForgetCache drops the cached subscription after a subscription event.
func (s *SubscriptionService) ForgetCache(ctx context.Context, event ports.Event) {
	if establishmentID, ok := subscriptionEventEstablishment(event); ok {
		s.cache.Forget(ctx, subscriptionCacheKey(establishmentID))
	}
}

// PublishRealtime tells the establishment's screens that the subscription changed.
func (s *SubscriptionService) PublishRealtime(_ context.Context, event ports.Event) {
	if establishmentID, ok := subscriptionEventEstablishment(event); ok {
		s.realtime.Publish(establishmentID, domain.RealtimeSubscriptionUpdated, map[string]string{"establishmentId": establishmentID})
	}
}

// ReportDuplicate logs a cancelled duplicate subscription, which may need a refund by hand.
func (s *SubscriptionService) ReportDuplicate(_ context.Context, event ports.Event) {
	duplicate, ok := event.(domain.DuplicateSubscriptionDetected)
	if !ok {
		return
	}

	slog.Error("billing incident: a duplicated subscription was cancelled; check Stripe for a charge on it and refund it by hand if it went through",
		"establishmentId", duplicate.EstablishmentID,
		"cancelledSubscriptionId", duplicate.CancelledSubscriptionID,
		"keptSubscriptionId", duplicate.KeptSubscriptionID)
}

// subscriptionEventEstablishment is the establishment a subscription event is about.
func subscriptionEventEstablishment(event ports.Event) (string, bool) {
	switch e := event.(type) {
	case domain.SubscriptionActivated:
		return e.EstablishmentID, true
	case domain.SubscriptionCancelled:
		return e.EstablishmentID, true
	case domain.SubscriptionOverridden:
		return e.EstablishmentID, true
	case domain.SubscriptionPaymentFailed:
		return e.EstablishmentID, true
	case domain.SubscriptionRenewed:
		return e.EstablishmentID, true
	default:
		return "", false
	}
}
