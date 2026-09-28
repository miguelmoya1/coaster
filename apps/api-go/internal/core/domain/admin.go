package domain

import (
	"encoding/json"
	"time"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type PageRequest struct {
	Page     int
	PageSize int
}

func NewPageRequest(page, pageSize *int) PageRequest {
	request := PageRequest{Page: 1, PageSize: DefaultPageSize}
	if page != nil {
		request.Page = max(1, *page)
	}
	if pageSize != nil {
		request.PageSize = min(MaxPageSize, max(1, *pageSize))
	}
	return request
}

func (p PageRequest) Offset() int {
	return (p.Page - 1) * p.PageSize
}

type Paginated[T any] struct {
	Items    []T `json:"items"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

func NewPage[T any](items []T, total int, request PageRequest) Paginated[T] {
	if items == nil {
		items = []T{}
	}
	return Paginated[T]{Items: items, Total: total, Page: request.Page, PageSize: request.PageSize}
}

var AdminAuditActions = []string{
	AuditEstablishmentPlanGranted,
	AuditEstablishmentPlanRevoked,
	AuditEstablishmentRenamed,
	AuditEstablishmentMemberRoleChanged,
	AuditEstablishmentModulesChanged,
	AuditUserRoleChanged,
	AuditUserActivationChanged,
	AuditBetaTesterAdded,
	AuditBetaTesterRemoved,
	AuditTimeEntryCreated,
	AuditTimeEntryAmended,
	AuditTimeEntryVoided,
}

var AdminAuditTargetTypes = []string{
	AuditTargetEstablishment,
	AuditTargetUser,
	AuditTargetBetaTester,
	AuditTargetTimeEntry,
}

type AdminAuditFilter struct {
	TargetType string
	TargetID   string
	Action     string
}

type AdminAuditLogEntry struct {
	ID          string          `json:"id"`
	Action      string          `json:"action"`
	TargetType  string          `json:"targetType"`
	TargetID    string          `json:"targetId"`
	TargetLabel *string         `json:"targetLabel"`
	Reason      *string         `json:"reason"`
	Metadata    json.RawMessage `json:"metadata"`
	ActorID     string          `json:"actorId"`
	ActorName   string          `json:"actorName"`
	ActorEmail  string          `json:"actorEmail"`
	CreatedAt   Time            `json:"createdAt"`
}

type BetaTester struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Note          *string `json:"note"`
	CreatedAt     Time    `json:"createdAt"`
	InvitedByName *string `json:"invitedByName"`
	UserID        *string `json:"userId"`
	SignedUpAt    *Time   `json:"signedUpAt"`
}

type AdminBetaTesters struct {
	Paginated[BetaTester]
	Enforcing bool `json:"enforcing"`
}

type BetaSignUp struct {
	UserID    string
	Email     string
	CreatedAt time.Time
}

type AdminUserFilter struct {
	Search string
	Role   Role
	Active *bool
}

type AdminUserSummary struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Email              string  `json:"email"`
	PhotoURL           *string `json:"photoUrl"`
	Role               Role    `json:"role"`
	Active             bool    `json:"active"`
	Language           string  `json:"language"`
	CreatedAt          Time    `json:"createdAt"`
	EstablishmentCount int     `json:"establishmentCount"`
}

type AdminUserMembership struct {
	EstablishmentID   string            `json:"establishmentId"`
	EstablishmentName string            `json:"establishmentName"`
	Role              EstablishmentRole `json:"role"`
	Active            bool              `json:"active"`
	JoinedAt          Time              `json:"joinedAt"`
}

type AdminUserDetail struct {
	User           AdminUserSummary      `json:"user"`
	Establishments []AdminUserMembership `json:"establishments"`
	RecentActivity []AdminAuditLogEntry  `json:"recentActivity"`
}

type AdminUserChanges struct {
	Role   *Role
	Active *bool
}

type EstablishmentBillingSource string

const (
	BillingSourceNone   EstablishmentBillingSource = "NONE"
	BillingSourceStripe EstablishmentBillingSource = "STRIPE"
	BillingSourceManual EstablishmentBillingSource = "MANUAL"
)

type AdminEstablishmentFilter struct {
	Search        string
	BillingSource EstablishmentBillingSource
	Status        SubscriptionStatus
}

type AdminBilling struct {
	EstablishmentSubscription
	ManualGrantReason *string
	ManualGrantedByID *string
	ManualGrantedAt   *time.Time
}

type AdminEstablishmentRow struct {
	ID          string
	Name        string
	CreatedAt   time.Time
	MemberCount int
	OwnerName   *string
	OwnerEmail  *string
	Billing     *AdminBilling
}

type AdminEstablishmentSummary struct {
	ID            string                     `json:"id"`
	Name          string                     `json:"name"`
	CreatedAt     Time                       `json:"createdAt"`
	MemberCount   int                        `json:"memberCount"`
	OwnerName     *string                    `json:"ownerName"`
	OwnerEmail    *string                    `json:"ownerEmail"`
	Plan          SubscriptionPlan           `json:"plan"`
	Status        SubscriptionStatus         `json:"status"`
	BillingSource EstablishmentBillingSource `json:"billingSource"`
	AccessEndsAt  *Time                      `json:"accessEndsAt"`
	HasAccess     bool                       `json:"hasAccess"`
}

func (row AdminEstablishmentRow) Summary(now time.Time) AdminEstablishmentSummary {
	summary := AdminEstablishmentSummary{
		ID:            row.ID,
		Name:          row.Name,
		CreatedAt:     NewTime(row.CreatedAt),
		MemberCount:   row.MemberCount,
		OwnerName:     row.OwnerName,
		OwnerEmail:    row.OwnerEmail,
		Plan:          PlanFree,
		Status:        SubscriptionInactive,
		BillingSource: BillingSourceNone,
	}

	billing := row.Billing
	if billing == nil {
		return summary
	}

	view := billing.View(now)
	summary.Plan = view.Plan
	summary.Status = view.Status

	grantIsLive := IsManualGrantActive(billing.State(), now)
	stripeAccess := billing.hasStripeAccess(now)

	switch {
	case grantIsLive:
		summary.BillingSource = BillingSourceManual
		summary.AccessEndsAt = billingTime(billing.ManualGrantExpiresAt)
	case stripeAccess:
		summary.BillingSource = BillingSourceStripe
	}

	if !grantIsLive {
		summary.AccessEndsAt = billingTime(billing.CurrentPeriodEnd)
		if summary.AccessEndsAt == nil {
			summary.AccessEndsAt = billingTime(billing.TrialEndsAt)
		}
	}

	summary.HasAccess = grantIsLive || stripeAccess
	return summary
}

func (b *AdminBilling) hasStripeAccess(now time.Time) bool {
	switch b.Status {
	case SubscriptionActive:
		return b.HasStripeSubscription() && b.CurrentPeriodEnd != nil && !now.After(*b.CurrentPeriodEnd)
	case SubscriptionTrialing:
		return b.TrialEndsAt != nil && !now.After(*b.TrialEndsAt)
	case SubscriptionCanceled:
		return b.CurrentPeriodEnd != nil && !now.After(*b.CurrentPeriodEnd)
	case SubscriptionPastDue:
		return true
	default:
		return false
	}
}

type AdminEstablishmentSubscription struct {
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
	ManualGrant          *AdminManualGrant  `json:"manualGrant"`
}

type AdminManualGrant struct {
	Plan          SubscriptionPlan `json:"plan"`
	ExpiresAt     *Time            `json:"expiresAt"`
	Reason        *string          `json:"reason"`
	GrantedByID   *string          `json:"grantedById"`
	GrantedByName *string          `json:"grantedByName"`
	GrantedAt     Time             `json:"grantedAt"`
}

func (b *AdminBilling) AdminView(grantedByName *string, now time.Time) AdminEstablishmentSubscription {
	view := b.View(now)

	subscription := AdminEstablishmentSubscription{
		ID:                   view.ID,
		EstablishmentID:      view.EstablishmentID,
		Plan:                 view.Plan,
		Status:               view.Status,
		StripeCustomerID:     view.StripeCustomerID,
		StripeSubscriptionID: view.StripeSubscriptionID,
		CurrentPeriodStart:   view.CurrentPeriodStart,
		CurrentPeriodEnd:     view.CurrentPeriodEnd,
		TrialEndsAt:          view.TrialEndsAt,
		CanceledAt:           view.CanceledAt,
		CreatedAt:            view.CreatedAt,
		UpdatedAt:            view.UpdatedAt,
	}

	if view.ManualGrant != nil {
		grantedAt := b.UpdatedAt
		if b.ManualGrantedAt != nil {
			grantedAt = *b.ManualGrantedAt
		}

		subscription.ManualGrant = &AdminManualGrant{
			Plan:          view.ManualGrant.Plan,
			ExpiresAt:     view.ManualGrant.ExpiresAt,
			Reason:        b.ManualGrantReason,
			GrantedByID:   b.ManualGrantedByID,
			GrantedByName: grantedByName,
			GrantedAt:     NewTime(grantedAt),
		}
	}

	return subscription
}

type ManualPlanGrant struct {
	Plan        SubscriptionPlan
	ExpiresAt   *time.Time
	Reason      *string
	GrantedByID string
}

type AdminEstablishmentSettings struct {
	EstablishmentID string                `json:"establishmentId"`
	Modules         []EstablishmentModule `json:"modules"`
	Language        string                `json:"language"`
	MarkSoldOut     bool                  `json:"markSoldOut"`
	ConfiguredAt    *Time                 `json:"configuredAt"`
}

func (s AdminEstablishmentSettings) Resolved() AdminEstablishmentSettings {
	s.Modules = ResolveModules(s.Modules)
	s.Language = AsLanguage(s.Language)
	return s
}

func DefaultAdminEstablishmentSettings(establishmentID string) AdminEstablishmentSettings {
	return AdminEstablishmentSettings{
		EstablishmentID: establishmentID,
		Modules:         ResolveModules(DefaultEstablishmentModules),
		Language:        DefaultLanguage,
	}
}

type AdminEstablishmentMember struct {
	ID       string            `json:"id"`
	UserID   string            `json:"userId"`
	Name     string            `json:"name"`
	Email    string            `json:"email"`
	PhotoURL *string           `json:"photoUrl"`
	Role     EstablishmentRole `json:"role"`
	Active   bool              `json:"active"`
	JoinedAt Time              `json:"joinedAt"`
}

type AdminEstablishmentCounters struct {
	Categories        int `json:"categories"`
	Products          int `json:"products"`
	Tables            int `json:"tables"`
	Orders            int `json:"orders"`
	OrdersLast30Days  int `json:"ordersLast30Days"`
	RevenueLast30Days int `json:"revenueLast30Days"`
}

type AdminEstablishmentDetail struct {
	Establishment AdminEstablishmentSummary  `json:"establishment"`
	Settings      AdminEstablishmentSettings `json:"settings"`

	Subscription   any                        `json:"subscription"`
	Members        []AdminEstablishmentMember `json:"members"`
	Counters       AdminEstablishmentCounters `json:"counters"`
	RecentActivity []AdminAuditLogEntry       `json:"recentActivity"`
}

type AdminPlatformMetrics struct {
	Establishments AdminEstablishmentMetrics `json:"establishments"`
	Users          AdminUserMetrics          `json:"users"`
	Subscriptions  AdminSubscriptionMetrics  `json:"subscriptions"`
	Activity       AdminActivityMetrics      `json:"activity"`
}

type AdminEstablishmentMetrics struct {
	Total             int `json:"total"`
	CreatedLast7Days  int `json:"createdLast7Days"`
	CreatedLast30Days int `json:"createdLast30Days"`
}

type AdminUserMetrics struct {
	Total             int `json:"total"`
	Active            int `json:"active"`
	Admins            int `json:"admins"`
	CreatedLast30Days int `json:"createdLast30Days"`
}

type AdminSubscriptionMetrics struct {
	WithAccess int                      `json:"withAccess"`
	Stripe     int                      `json:"stripe"`
	Manual     int                      `json:"manual"`
	ByStatus   SubscriptionStatusCounts `json:"byStatus"`
	ByPlan     SubscriptionPlanCounts   `json:"byPlan"`
}

type AdminActivityMetrics struct {
	OrdersLast30Days  int `json:"ordersLast30Days"`
	RevenueLast30Days int `json:"revenueLast30Days"`
}

type SubscriptionStatusCounts struct {
	Inactive int `json:"INACTIVE"`
	Trialing int `json:"TRIALING"`
	Active   int `json:"ACTIVE"`
	PastDue  int `json:"PAST_DUE"`
	Canceled int `json:"CANCELED"`
	Unpaid   int `json:"UNPAID"`
	Expired  int `json:"EXPIRED"`
}

func (c *SubscriptionStatusCounts) Set(status SubscriptionStatus, count int) {
	switch status {
	case SubscriptionInactive:
		c.Inactive = count
	case SubscriptionTrialing:
		c.Trialing = count
	case SubscriptionActive:
		c.Active = count
	case SubscriptionPastDue:
		c.PastDue = count
	case SubscriptionCanceled:
		c.Canceled = count
	case SubscriptionUnpaid:
		c.Unpaid = count
	case SubscriptionExpired:
		c.Expired = count
	}
}

type SubscriptionPlanCounts struct {
	Free int `json:"FREE"`
	Pro  int `json:"PRO"`
}

func (c *SubscriptionPlanCounts) Set(plan SubscriptionPlan, count int) {
	switch plan {
	case PlanFree:
		c.Free = count
	case PlanPro:
		c.Pro = count
	}
}
