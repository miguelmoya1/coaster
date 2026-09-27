package domain

import "time"

// EstablishmentSubscription is a row of EstablishmentSubscription: what the establishment
// pays for, projected from Stripe, plus the plan an admin may have granted by hand.
type EstablishmentSubscription struct {
	ID                   string
	EstablishmentID      string
	Plan                 SubscriptionPlan
	Status               SubscriptionStatus
	StripeCustomerID     *string
	StripeSubscriptionID *string
	CurrentPeriodStart   *time.Time
	CurrentPeriodEnd     *time.Time
	TrialEndsAt          *time.Time
	CanceledAt           *time.Time
	Seats                int
	ManualPlan           *SubscriptionPlan
	ManualGrantExpiresAt *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// HasStripeSubscription reports whether the row is linked to a Stripe subscription.
func (s *EstablishmentSubscription) HasStripeSubscription() bool {
	return s != nil && s.StripeSubscriptionID != nil && *s.StripeSubscriptionID != ""
}

// State is what the route checks read about the subscription.
func (s *EstablishmentSubscription) State() *SubscriptionState {
	return &SubscriptionState{
		Status:               s.Status,
		StripeSubscriptionID: s.StripeSubscriptionID,
		CurrentPeriodEnd:     billingTime(s.CurrentPeriodEnd),
		TrialEndsAt:          billingTime(s.TrialEndsAt),
		ManualPlan:           s.ManualPlan,
		ManualGrantExpiresAt: billingTime(s.ManualGrantExpiresAt),
	}
}

// View is the subscription as the workspace sees it (EstablishmentSubscriptionMapper.toDomain):
// an active manual grant wins over Stripe, and a lapsed period shows as EXPIRED.
func (s *EstablishmentSubscription) View(now time.Time) EstablishmentSubscriptionView {
	view := EstablishmentSubscriptionView{
		ID:                   s.ID,
		EstablishmentID:      s.EstablishmentID,
		Plan:                 s.Plan,
		Status:               s.effectiveStatus(now),
		StripeCustomerID:     s.StripeCustomerID,
		StripeSubscriptionID: s.StripeSubscriptionID,
		CurrentPeriodStart:   billingTime(s.CurrentPeriodStart),
		CurrentPeriodEnd:     billingTime(s.CurrentPeriodEnd),
		TrialEndsAt:          billingTime(s.TrialEndsAt),
		CanceledAt:           billingTime(s.CanceledAt),
		CreatedAt:            Time{Time: s.CreatedAt},
		UpdatedAt:            Time{Time: s.UpdatedAt},
	}

	if IsManualGrantActive(s.State(), now) {
		view.Plan = *s.ManualPlan
		view.Status = SubscriptionActive
		view.ManualGrant = &ManualGrant{Plan: *s.ManualPlan, ExpiresAt: billingTime(s.ManualGrantExpiresAt)}
	}

	return view
}

// effectiveStatus is the stored status corrected by the dates, without waiting for Stripe.
func (s *EstablishmentSubscription) effectiveStatus(now time.Time) SubscriptionStatus {
	switch {
	case s.Status == SubscriptionActive && (!s.HasStripeSubscription() || s.CurrentPeriodEnd == nil):
		return SubscriptionInactive
	case s.Status == SubscriptionTrialing && s.TrialEndsAt != nil && now.After(*s.TrialEndsAt):
		return SubscriptionExpired
	case (s.Status == SubscriptionCanceled || s.Status == SubscriptionActive) && s.CurrentPeriodEnd != nil && now.After(*s.CurrentPeriodEnd):
		return SubscriptionExpired
	default:
		return s.Status
	}
}

// FreeSubscriptionView is what an establishment that never subscribed shows: FREE and locked.
func FreeSubscriptionView(establishmentID string, now time.Time) EstablishmentSubscriptionView {
	return EstablishmentSubscriptionView{
		EstablishmentID: establishmentID,
		Plan:            PlanFree,
		Status:          SubscriptionInactive,
		CreatedAt:       Time{Time: now},
		UpdatedAt:       Time{Time: now},
	}
}

// EstablishmentSubscriptionView is EstablishmentSubscription in @coaster/common.
type EstablishmentSubscriptionView struct {
	ID                   string             `json:"id"`
	EstablishmentID      string             `json:"establishmentId"`
	Plan                 SubscriptionPlan   `json:"plan"`
	Status               SubscriptionStatus `json:"status"`
	StripeCustomerID     *string            `json:"stripeCustomerId"`
	StripeSubscriptionID *string            `json:"stripeSubscriptionId"`
	CurrentPeriodStart   *Time              `json:"currentPeriodStart"`
	CurrentPeriodEnd     *Time              `json:"currentPeriodEnd"`
	TrialEndsAt          *Time              `json:"trialEndsAt"`
	CanceledAt           *Time              `json:"canceledAt"`
	ManualGrant          *ManualGrant       `json:"manualGrant"`
	CreatedAt            Time               `json:"createdAt"`
	UpdatedAt            Time               `json:"updatedAt"`
}

// ManualGrant is the plan an admin granted, without the admin's note.
type ManualGrant struct {
	Plan      SubscriptionPlan `json:"plan"`
	ExpiresAt *Time            `json:"expiresAt"`
}

// SubscriptionSeats compares the staff with the seats Stripe bills.
type SubscriptionSeats struct {
	Used            int `json:"used"`
	Billed          int `json:"billed"`
	Included        int `json:"included"`
	BasePriceCents  int `json:"basePriceCents"`
	ExtraPriceCents int `json:"extraPriceCents"`
}

// CheckoutSession is where the owner goes to pay (CreateCheckoutSessionResponse).
type CheckoutSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// PortalSession is Stripe's customer portal (CreateCustomerPortalSessionResponse).
type PortalSession struct {
	URL string `json:"url"`
}

// SubscriptionBilling is the part of the row only Stripe knows: seats and dates.
type SubscriptionBilling struct {
	Seats              int
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
	TrialEndsAt        *time.Time
	CanceledAt         *time.Time
}

// SubscriptionSnapshot is a Stripe subscription turned into the columns we store
// (toSubscriptionSnapshot in Nest).
type SubscriptionSnapshot struct {
	Plan                 SubscriptionPlan
	Status               SubscriptionStatus
	StripeSubscriptionID *string
	Billing              SubscriptionBilling
	// IsCancellation is true for a cancelled subscription and for one that will end.
	IsCancellation bool
}

// SubscriptionUpsert is what a webhook writes on the establishment's row, creating it if
// there is none. Billing is nil when Stripe did not know the subscription yet: then the
// seats and dates stay as they are.
type SubscriptionUpsert struct {
	Plan                 SubscriptionPlan
	Status               SubscriptionStatus
	StripeCustomerID     string
	StripeSubscriptionID *string
	Billing              *SubscriptionBilling
}

// billingTime turns an optional time into an optional Time for JSON.
func billingTime(t *time.Time) *Time {
	if t == nil {
		return nil
	}
	return &Time{Time: *t}
}
