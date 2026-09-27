package service

import (
	"crypto/rand"
	"crypto/sha256"
	"strconv"
	"strings"
	"time"

	"api-go/internal/core/domain"
)

// The prices and seat allowance used when the environment says nothing (stripe.utils.ts).
const (
	defaultBasePriceCents      = 1999
	defaultIncludedSeats       = 10
	defaultExtraSeatPriceCents = 200
)

// BillingConfig is what the subscription service reads from the environment. The numbers
// stay as text, as they come, and a value that is not a positive whole number is ignored.
type BillingConfig struct {
	// PricePro is the Stripe price new subscriptions are sold at.
	PricePro string
	// PriceProLegacy lists, separated by commas, older prices that still count as PRO.
	PriceProLegacy      string
	BasePriceCents      string
	IncludedSeats       string
	ExtraSeatPriceCents string
	// FrontendURL has no trailing slash (config.Load already strips it).
	FrontendURL string
}

// priceID is the Stripe price a plan is sold at (getPriceId).
func (c BillingConfig) priceID(plan domain.SubscriptionPlan) (string, error) {
	if plan != domain.PlanPro {
		return "", domain.BadRequest(domain.CodeInvalidSubscriptionPlan)
	}

	if c.PricePro == "" {
		return "", domain.Internal(domain.CodeStripePriceNotConfigured)
	}

	return c.PricePro, nil
}

// proPriceIDs are every price that counts as PRO, the current one first.
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

// planOf is the plan a Stripe price belongs to (toDbPlan).
func (c BillingConfig) planOf(priceID string) domain.SubscriptionPlan {
	for _, id := range c.proPriceIDs() {
		if priceID != "" && priceID == id {
			return domain.PlanPro
		}
	}

	return domain.PlanFree
}

func (c BillingConfig) basePriceCents() int {
	return readPositiveInt(c.BasePriceCents, defaultBasePriceCents)
}

func (c BillingConfig) includedSeats() int {
	return readPositiveInt(c.IncludedSeats, defaultIncludedSeats)
}

func (c BillingConfig) extraSeatPriceCents() int {
	return readPositiveInt(c.ExtraSeatPriceCents, defaultExtraSeatPriceCents)
}

// dashboardURL is where Stripe sends the owner back to (billing-urls.ts).
func (c BillingConfig) dashboardURL(establishmentID string) string {
	return c.FrontendURL + "/establishments/" + establishmentID + "/dashboard"
}

func (c BillingConfig) checkoutSuccessURL(establishmentID string) string {
	return c.dashboardURL(establishmentID) + "?billing=success&session_id={CHECKOUT_SESSION_ID}"
}

func (c BillingConfig) checkoutCancelURL(establishmentID string) string {
	return c.dashboardURL(establishmentID) + "?billing=cancelled"
}

// snapshot turns a Stripe subscription into the columns we store (toSubscriptionSnapshot).
// A cancelled subscription falls to FREE and loses its id; one that will end shows as
// CANCELED until then.
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

// statusFromStripe maps Stripe's status to ours (toDbStatus). Anything else is INACTIVE.
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

// integrationIdentifier is the integration_identifier of a Checkout session
// (createIntegrationIdentifier): the same seed always gives the same one, so a retried
// request sends the same payload. Without a seed it is random.
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

// The idempotency window of a Checkout session: a repeated purchase within the same half
// hour gets the same session, which lives two hours.
const (
	checkoutIdempotencyBucket = 30 * time.Minute
	checkoutSessionTTL        = 2 * time.Hour
)

// checkoutBucket is the half hour now falls in.
func checkoutBucket(now time.Time) int64 {
	return now.UnixMilli() / checkoutIdempotencyBucket.Milliseconds()
}

// checkoutExpiry is when a session created in bucket expires.
func checkoutExpiry(bucket int64) time.Time {
	start := time.UnixMilli(bucket * checkoutIdempotencyBucket.Milliseconds())
	return start.Add(checkoutSessionTTL)
}

func readPositiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}
