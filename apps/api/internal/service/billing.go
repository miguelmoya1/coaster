package service

import (
	"crypto/rand"
	"crypto/sha256"
	"strings"
	"time"

	"coaster-api/internal/core/domain"
)

type BillingConfig struct {
	PricePro string

	PriceProLegacy      string
	BasePriceCents      int
	IncludedSeats       int
	ExtraSeatPriceCents int

	FrontendURL string
}

func (c BillingConfig) priceID(plan domain.SubscriptionPlan) (string, error) {
	if plan != domain.PlanPro {
		return "", domain.BadRequest(domain.CodeInvalidSubscriptionPlan)
	}

	if c.PricePro == "" {
		return "", domain.Internal(domain.CodeStripePriceNotConfigured)
	}

	return c.PricePro, nil
}

func (c BillingConfig) proPriceIDs() []string {
	var ids []string

	for _, value := range []string{c.PricePro, c.PriceProLegacy} {
		for id := range strings.SplitSeq(value, ",") {
			id = strings.TrimSpace(id)
			if id != "" {
				ids = append(ids, id)
			}
		}
	}

	return ids
}

func (c BillingConfig) planOf(priceID string) domain.SubscriptionPlan {
	for _, id := range c.proPriceIDs() {
		if priceID != "" && priceID == id {
			return domain.PlanPro
		}
	}

	return domain.PlanFree
}

func (c BillingConfig) dashboardURL(establishmentID string) string {
	return c.FrontendURL + "/establishments/" + establishmentID + "/dashboard"
}

func (c BillingConfig) checkoutSuccessURL(establishmentID string) string {
	return c.dashboardURL(establishmentID) + "?billing=success&session_id={CHECKOUT_SESSION_ID}"
}

func (c BillingConfig) checkoutCancelURL(establishmentID string) string {
	return c.dashboardURL(establishmentID) + "?billing=cancelled"
}

func (c BillingConfig) snapshot(subscription *domain.StripeSubscription) domain.SubscriptionSnapshot {
	var first domain.StripeSubscriptionItem
	if len(subscription.Items) > 0 {
		first = subscription.Items[0]
	}

	isTerminal := subscription.Status == domain.StripeStatusCanceled
	isScheduled := subscription.CancelAtPeriodEnd || subscription.CancelAt != nil

	snapshot := domain.SubscriptionSnapshot{
		Plan:                 c.planOf(first.PriceID),
		Status:               statusFromStripe(subscription.Status),
		StripeSubscriptionID: &subscription.ID,
		Billing: domain.SubscriptionBilling{
			Seats:              first.Quantity,
			CurrentPeriodStart: first.CurrentPeriodStart,
			CurrentPeriodEnd:   first.CurrentPeriodEnd,
			TrialEndsAt:        subscription.TrialEnd,
			CanceledAt:         subscription.CanceledAt,
		},
		IsCancellation: isTerminal || isScheduled,
	}

	if snapshot.Billing.Seats == 0 {
		snapshot.Billing.Seats = 1
	}
	if subscription.CancelAt != nil {
		snapshot.Billing.CurrentPeriodEnd = subscription.CancelAt
	}
	if snapshot.IsCancellation {
		snapshot.Status = domain.SubscriptionCanceled
	}
	if isTerminal {
		snapshot.Plan = domain.PlanFree
		snapshot.StripeSubscriptionID = nil
	}

	return snapshot
}

func statusFromStripe(status string) domain.SubscriptionStatus {
	switch status {
	case domain.StripeStatusTrialing:
		return domain.SubscriptionTrialing
	case domain.StripeStatusActive:
		return domain.SubscriptionActive
	case domain.StripeStatusPastDue:
		return domain.SubscriptionPastDue
	case domain.StripeStatusCanceled:
		return domain.SubscriptionCanceled
	case domain.StripeStatusUnpaid:
		return domain.SubscriptionUnpaid
	case domain.StripeStatusIncompleteExpired:
		return domain.SubscriptionExpired
	default:
		return domain.SubscriptionInactive
	}
}

func integrationIdentifier(seed string) string {
	var bytes []byte
	if seed == "" {
		bytes = make([]byte, 8)
		rand.Read(bytes)
	} else {
		sum := sha256.Sum256([]byte(seed))
		bytes = sum[:8]
	}

	const alphabet = "abcdefghijklmnopqrstuvwxyz"
	suffix := make([]byte, len(bytes))
	for i, b := range bytes {
		suffix[i] = alphabet[int(b)%len(alphabet)]
	}

	return "coaster_subscription_" + string(suffix)
}

const (
	checkoutIdempotencyBucket = 30 * time.Minute
	checkoutSessionTTL        = 2 * time.Hour
)

func checkoutBucket(now time.Time) int64 {
	return now.UnixMilli() / checkoutIdempotencyBucket.Milliseconds()
}

func checkoutExpiry(bucket int64) time.Time {
	start := time.UnixMilli(bucket * checkoutIdempotencyBucket.Milliseconds())
	return start.Add(checkoutSessionTTL)
}
