package service

import (
	"context"
	"log/slog"

	"api-go/internal/core/domain"
)

// HandleWebhook checks a Stripe webhook and projects the event onto the establishment's
// subscription. An error makes Stripe deliver it again later.
func (s *SubscriptionService) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
	event, err := s.payments.ParseWebhook(payload, signature)
	if err != nil {
		return err
	}

	slog.Debug("routing Stripe webhook", "type", event.Type, "eventId", event.ID)

	switch event.Type {
	case domain.StripeEventCheckoutCompleted:
		return s.checkoutCompleted(ctx, event.CheckoutSession)
	case domain.StripeEventSubscriptionCreated,
		domain.StripeEventSubscriptionUpdated,
		domain.StripeEventSubscriptionDeleted,
		domain.StripeEventSubscriptionPaused,
		domain.StripeEventSubscriptionResumed:
		return s.subscriptionChanged(ctx, event.Subscription)
	case domain.StripeEventInvoicePaid:
		return s.invoicePaid(ctx, event.Invoice)
	case domain.StripeEventInvoicePaymentFailed:
		return s.invoicePaymentFailed(ctx, event.Invoice)
	default:
		slog.Debug("unhandled Stripe webhook event", "type", event.Type)
		return nil
	}
}

// checkoutCompleted links the new subscription to the establishment that paid for it, or
// cancels it when the establishment already has a live one.
func (s *SubscriptionService) checkoutCompleted(ctx context.Context, session *domain.StripeCheckoutSession) error {
	if session.Mode != domain.StripeCheckoutModeSubscription {
		slog.Debug("ignoring a checkout session that is not for a subscription", "sessionId", session.ID, "mode", session.Mode)
		return nil
	}

	establishmentID := session.Metadata["establishmentId"]
	if establishmentID == "" {
		establishmentID = session.ClientReferenceID
	}

	if establishmentID == "" {
		slog.Error("cannot process checkout completion: establishmentId missing", "sessionId", session.ID)
		return domain.Internal(domain.CodeStripeWebhookEstablishmentIdMissing)
	}
	if session.CustomerID == "" {
		slog.Error("cannot process checkout completion: customerId missing", "sessionId", session.ID)
		return domain.Internal(domain.CodeStripeWebhookCustomerMissing)
	}
	if session.SubscriptionID == "" {
		slog.Error("cannot process checkout completion: subscriptionId missing", "sessionId", session.ID)
		return domain.Internal(domain.CodeStripeWebhookSubscriptionMissing)
	}

	duplicate, err := s.cancelIfDuplicate(ctx, establishmentID, session.SubscriptionID)
	if err != nil || duplicate {
		return err
	}

	data, err := s.checkoutState(ctx, session.CustomerID, session.SubscriptionID)
	if err != nil {
		return err
	}

	if err := s.repo.Upsert(ctx, establishmentID, data); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.SubscriptionActivated{EstablishmentID: establishmentID, StripeSubscriptionID: session.SubscriptionID})
	return nil
}

// checkoutState is what to store for a finished Checkout: what Stripe says about the
// subscription, or just the links, as inactive, while Stripe does not know it yet.
func (s *SubscriptionService) checkoutState(ctx context.Context, customerID, subscriptionID string) (domain.SubscriptionUpsert, error) {
	subscription, err := s.payments.RetrieveSubscription(ctx, subscriptionID)
	if err != nil {
		return domain.SubscriptionUpsert{}, err
	}

	if subscription == nil {
		slog.Warn("Stripe does not know the subscription yet; linking it as inactive until an event says otherwise",
			"subscriptionId", subscriptionID)

		return domain.SubscriptionUpsert{
			Plan:                 domain.PlanFree,
			Status:               domain.SubscriptionInactive,
			StripeCustomerID:     customerID,
			StripeSubscriptionID: &subscriptionID,
		}, nil
	}

	snapshot := s.billing.snapshot(subscription)
	if snapshot.StripeSubscriptionID == nil {
		snapshot.StripeSubscriptionID = &subscriptionID
	}

	return domain.SubscriptionUpsert{
		Plan:                 snapshot.Plan,
		Status:               snapshot.Status,
		StripeCustomerID:     customerID,
		StripeSubscriptionID: snapshot.StripeSubscriptionID,
		Billing:              &snapshot.Billing,
	}, nil
}

// cancelIfDuplicate cancels incomingID when the establishment already tracks another
// subscription that is still live, and reports whether it did.
func (s *SubscriptionService) cancelIfDuplicate(ctx context.Context, establishmentID, incomingID string) (bool, error) {
	existing, err := s.repo.FindByEstablishmentID(ctx, establishmentID)
	if err != nil {
		return false, err
	}

	if !existing.HasStripeSubscription() || *existing.StripeSubscriptionID == incomingID {
		return false, nil
	}
	trackedID := *existing.StripeSubscriptionID

	tracked, err := s.payments.RetrieveSubscription(ctx, trackedID)
	if err != nil {
		return false, err
	}

	if tracked == nil || !tracked.IsLive() {
		slog.Debug("replacing a dead subscription", "establishmentId", establishmentID, "from", trackedID, "to", incomingID)
		return false, nil
	}

	slog.Warn("cancelling a duplicate subscription: the establishment already has a live one",
		"establishmentId", establishmentID, "duplicateId", incomingID, "liveId", trackedID)

	if _, err := s.payments.CancelSubscription(ctx, incomingID); err != nil {
		return false, err
	}

	s.events.Publish(ctx, domain.DuplicateSubscriptionDetected{
		EstablishmentID:         establishmentID,
		KeptSubscriptionID:      trackedID,
		CancelledSubscriptionID: incomingID,
	})

	return true, nil
}

// subscriptionChanged stores what Stripe says about a subscription of one of our
// establishments.
func (s *SubscriptionService) subscriptionChanged(ctx context.Context, subscription *domain.StripeSubscription) error {
	if subscription.CustomerID == "" {
		slog.Error("cannot process subscription: customerId missing", "subscriptionId", subscription.ID)
		return domain.Internal(domain.CodeStripeWebhookCustomerMissing)
	}

	existing, err := s.repo.FindByStripeSubscriptionID(ctx, subscription.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		existing, err = s.repo.FindByStripeCustomerID(ctx, subscription.CustomerID)
		if err != nil {
			return err
		}
	}

	establishmentID := subscription.Metadata["establishmentId"]
	if existing != nil && existing.EstablishmentID != "" {
		establishmentID = existing.EstablishmentID
	}

	if establishmentID == "" {
		slog.Debug("subscription ignored: it belongs to no establishment of this platform", "subscriptionId", subscription.ID)
		return nil
	}

	if existing.HasStripeSubscription() && *existing.StripeSubscriptionID != subscription.ID {
		tracked, err := s.payments.RetrieveSubscription(ctx, *existing.StripeSubscriptionID)
		if err != nil {
			return err
		}

		if tracked != nil && tracked.IsLive() {
			slog.Warn("ignoring an event for an untracked subscription",
				"establishmentId", establishmentID, "subscriptionId", subscription.ID, "liveId", *existing.StripeSubscriptionID)
			return nil
		}
	}

	snapshot := s.billing.snapshot(subscription)

	err = s.repo.Upsert(ctx, establishmentID, domain.SubscriptionUpsert{
		Plan:                 snapshot.Plan,
		Status:               snapshot.Status,
		StripeCustomerID:     subscription.CustomerID,
		StripeSubscriptionID: snapshot.StripeSubscriptionID,
		Billing:              &snapshot.Billing,
	})
	if err != nil {
		return err
	}

	if snapshot.IsCancellation {
		s.events.Publish(ctx, domain.SubscriptionCancelled{
			EstablishmentID:      establishmentID,
			StripeSubscriptionID: subscription.ID,
			CanceledAt:           snapshot.Billing.CanceledAt,
		})
		return nil
	}

	if subscription.Status == domain.StripeStatusActive || subscription.Status == domain.StripeStatusTrialing {
		s.events.Publish(ctx, domain.SubscriptionRenewed{
			EstablishmentID:      establishmentID,
			StripeSubscriptionID: subscription.ID,
			CurrentPeriodEnd:     snapshot.Billing.CurrentPeriodEnd,
		})
	}

	return nil
}

// invoicePaid brings a PAST_DUE or UNPAID subscription back to ACTIVE.
func (s *SubscriptionService) invoicePaid(ctx context.Context, invoice *domain.StripeInvoice) error {
	existing, err := s.subscriptionOfInvoice(ctx, invoice)
	if err != nil || existing == nil {
		return err
	}

	if existing.Status != domain.SubscriptionPastDue && existing.Status != domain.SubscriptionUnpaid {
		slog.Debug("invoice paid: the subscription does not need recovery",
			"establishmentId", existing.EstablishmentID, "status", existing.Status)
		return nil
	}

	if err := s.repo.UpdateStatus(ctx, existing.EstablishmentID, domain.SubscriptionActive); err != nil {
		return err
	}

	subscriptionID := invoice.SubscriptionID
	if subscriptionID == "" && existing.StripeSubscriptionID != nil {
		subscriptionID = *existing.StripeSubscriptionID
	}

	s.events.Publish(ctx, domain.SubscriptionRenewed{
		EstablishmentID:      existing.EstablishmentID,
		StripeSubscriptionID: subscriptionID,
		CurrentPeriodEnd:     existing.CurrentPeriodEnd,
	})
	return nil
}

// invoicePaymentFailed marks the subscription PAST_DUE.
func (s *SubscriptionService) invoicePaymentFailed(ctx context.Context, invoice *domain.StripeInvoice) error {
	existing, err := s.subscriptionOfInvoice(ctx, invoice)
	if err != nil || existing == nil {
		return err
	}

	if err := s.repo.UpdateStatus(ctx, existing.EstablishmentID, domain.SubscriptionPastDue); err != nil {
		return err
	}

	customerID := invoice.CustomerID
	if customerID == "" && existing.StripeCustomerID != nil {
		customerID = *existing.StripeCustomerID
	}

	s.events.Publish(ctx, domain.SubscriptionPaymentFailed{EstablishmentID: existing.EstablishmentID, StripeCustomerID: customerID})
	return nil
}

// subscriptionOfInvoice finds the row an invoice is about: by subscription, or by customer
// when the invoice has no subscription. It returns nil when there is none.
func (s *SubscriptionService) subscriptionOfInvoice(ctx context.Context, invoice *domain.StripeInvoice) (*domain.EstablishmentSubscription, error) {
	if invoice.CustomerID == "" && invoice.SubscriptionID == "" {
		slog.Debug("invoice event ignored: no customer and no subscription", "invoiceId", invoice.ID)
		return nil, nil
	}

	var existing *domain.EstablishmentSubscription
	var err error
	if invoice.SubscriptionID != "" {
		existing, err = s.repo.FindByStripeSubscriptionID(ctx, invoice.SubscriptionID)
	} else {
		existing, err = s.repo.FindByStripeCustomerID(ctx, invoice.CustomerID)
	}
	if err != nil {
		return nil, err
	}

	if existing == nil {
		slog.Debug("invoice event ignored: no subscription found",
			"customerId", invoice.CustomerID, "subscriptionId", invoice.SubscriptionID)
	}

	return existing, nil
}
