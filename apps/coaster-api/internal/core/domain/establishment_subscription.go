package domain

import (
	"encoding/json"
	"time"
)

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

func (s *EstablishmentSubscription) HasStripeSubscription() bool {
	return s != nil && s.StripeSubscriptionID != nil && *s.StripeSubscriptionID != ""
}

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

func FreeSubscriptionView(establishmentID string, now time.Time) EstablishmentSubscriptionView {
	return EstablishmentSubscriptionView{
		EstablishmentID: establishmentID,
		Plan:            PlanFree,
		Status:          SubscriptionInactive,
		CreatedAt:       Time{Time: now},
		UpdatedAt:       Time{Time: now},
		withoutRow:      true,
	}
}

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
	CreatedAt            Time               `json:"createdAt"`
	UpdatedAt            Time               `json:"updatedAt"`
	ManualGrant          *ManualGrant       `json:"manualGrant"`

	withoutRow bool
}

func (v EstablishmentSubscriptionView) MarshalJSON() ([]byte, error) {
	type withRow EstablishmentSubscriptionView
	if !v.withoutRow {
		return json.Marshal(withRow(v))
	}

	return json.Marshal(struct {
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
	}{
		ID: v.ID, EstablishmentID: v.EstablishmentID, Plan: v.Plan, Status: v.Status,
		StripeCustomerID: v.StripeCustomerID, StripeSubscriptionID: v.StripeSubscriptionID,
		CurrentPeriodStart: v.CurrentPeriodStart, CurrentPeriodEnd: v.CurrentPeriodEnd,
		TrialEndsAt: v.TrialEndsAt, CanceledAt: v.CanceledAt, ManualGrant: v.ManualGrant,
		CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt,
	})
}

type ManualGrant struct {
	Plan      SubscriptionPlan `json:"plan"`
	ExpiresAt *Time            `json:"expiresAt"`
}

type SubscriptionSeats struct {
	Used            int `json:"used"`
	Billed          int `json:"billed"`
	Included        int `json:"included"`
	BasePriceCents  int `json:"basePriceCents"`
	ExtraPriceCents int `json:"extraPriceCents"`
}

type CheckoutSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type PortalSession struct {
	URL string `json:"url"`
}

type SubscriptionBilling struct {
	Seats              int
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
	TrialEndsAt        *time.Time
	CanceledAt         *time.Time
}

type SubscriptionSnapshot struct {
	Plan                 SubscriptionPlan
	Status               SubscriptionStatus
	StripeSubscriptionID *string
	Billing              SubscriptionBilling

	IsCancellation bool
}

type SubscriptionUpsert struct {
	Plan                 SubscriptionPlan
	Status               SubscriptionStatus
	StripeCustomerID     string
	StripeSubscriptionID *string
	Billing              *SubscriptionBilling
}

func billingTime(t *time.Time) *Time {
	if t == nil {
		return nil
	}
	return &Time{Time: *t}
}
