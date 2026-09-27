package domain

import (
	"encoding/json"
	"time"
)

// The backoffice of the platform (the admin module of Nest). Its JSON is the Admin* types of
// @coaster/common.

// The paging of the backoffice lists (utils/pagination.ts).
const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// PageRequest is one page of a backoffice list, already within bounds.
type PageRequest struct {
	Page     int
	PageSize int
}

// NewPageRequest is resolvePage: page 1 with 20 rows unless the query says otherwise, and
// never less than one row or more than 100.
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

// Offset is how many rows come before the page.
func (p PageRequest) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// Paginated is Paginated<T>: one page of a list and how many rows the whole list has.
type Paginated[T any] struct {
	Items    []T `json:"items"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

// NewPage puts a page of items together with the request that asked for it.
func NewPage[T any](items []T, total int, request PageRequest) Paginated[T] {
	if items == nil {
		items = []T{}
	}
	return Paginated[T]{Items: items, Total: total, Page: request.Page, PageSize: request.PageSize}
}

// Audit log

// AdminAuditActions are every AdminAuditAction of @coaster/common, the ones about punches too.
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

// AdminAuditTargetTypes are every AdminAuditTargetType of @coaster/common.
var AdminAuditTargetTypes = []string{
	AuditTargetEstablishment,
	AuditTargetUser,
	AuditTargetBetaTester,
	AuditTargetTimeEntry,
}

// AdminAuditFilter narrows the backoffice log. An empty field matches everything.
type AdminAuditFilter struct {
	TargetType string
	TargetID   string
	Action     string
}

// AdminAuditLogEntry is AdminAuditLogEntry: a row of AdminAuditLog with who did it.
// Metadata is the stored JSON as it is, or nil when there is none.
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

// Beta testers

// BetaTester is BetaTester: an address that may open an account while the beta allowlist
// is on, and the account opened with it, if any.
type BetaTester struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Note          *string `json:"note"`
	CreatedAt     Time    `json:"createdAt"`
	InvitedByName *string `json:"invitedByName"`
	UserID        *string `json:"userId"`
	SignedUpAt    *Time   `json:"signedUpAt"`
}

// AdminBetaTesters is AdminBetaTesters: a page of the allowlist, and whether it is in force.
type AdminBetaTesters struct {
	Paginated[BetaTester]
	Enforcing bool `json:"enforcing"`
}

// BetaSignUp is an account opened with one of the allowlisted addresses.
type BetaSignUp struct {
	UserID    string
	Email     string
	CreatedAt time.Time
}

// Users

// AdminUserFilter narrows the list of users. An empty Search or Role and a nil Active match
// everything.
type AdminUserFilter struct {
	Search string
	Role   Role
	Active *bool
}

// AdminUserSummary is AdminUserSummary. EstablishmentCount counts every membership the user
// ever had, removed ones too, as Nest's _count does.
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

// AdminUserMembership is AdminUserEstablishmentMembership.
type AdminUserMembership struct {
	EstablishmentID   string            `json:"establishmentId"`
	EstablishmentName string            `json:"establishmentName"`
	Role              EstablishmentRole `json:"role"`
	Active            bool              `json:"active"`
	JoinedAt          Time              `json:"joinedAt"`
}

// AdminUserDetail is AdminUserDetail.
type AdminUserDetail struct {
	User           AdminUserSummary      `json:"user"`
	Establishments []AdminUserMembership `json:"establishments"`
	RecentActivity []AdminAuditLogEntry  `json:"recentActivity"`
}

// AdminUserChanges is UpdateAdminUserDto: a nil field stays as it is.
type AdminUserChanges struct {
	Role   *Role
	Active *bool
}

// Establishments

// EstablishmentBillingSource says where an establishment's access comes from.
type EstablishmentBillingSource string

const (
	BillingSourceNone   EstablishmentBillingSource = "NONE"
	BillingSourceStripe EstablishmentBillingSource = "STRIPE"
	BillingSourceManual EstablishmentBillingSource = "MANUAL"
)

// AdminEstablishmentFilter narrows the list of establishments. An empty field matches
// everything.
type AdminEstablishmentFilter struct {
	Search        string
	BillingSource EstablishmentBillingSource
	Status        SubscriptionStatus
}

// AdminBilling is the whole EstablishmentSubscription row, with who granted the manual plan
// and why, which the workspace never sees.
type AdminBilling struct {
	EstablishmentSubscription
	ManualGrantReason *string
	ManualGrantedByID *string
	ManualGrantedAt   *time.Time
}

// AdminEstablishmentRow is an establishment as the backoffice reads it: its subscription
// row, if it has one, how many members it ever had and its oldest active owner.
type AdminEstablishmentRow struct {
	ID          string
	Name        string
	CreatedAt   time.Time
	MemberCount int
	OwnerName   *string
	OwnerEmail  *string
	Billing     *AdminBilling
}

// AdminEstablishmentSummary is AdminEstablishmentSummary.
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

// Summary is AdminMapper.toEstablishmentSummary: a live manual grant wins over Stripe, and
// without either the establishment has no access.
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

// hasStripeAccess is the backoffice's own reading of the Stripe columns: an active paid
// period, a running trial or a cancelled period that has not ended. Unlike the route check,
// PAST_DUE does not count.
func (b *AdminBilling) hasStripeAccess(now time.Time) bool {
	switch b.Status {
	case SubscriptionActive:
		return b.HasStripeSubscription() && b.CurrentPeriodEnd != nil && !now.After(*b.CurrentPeriodEnd)
	case SubscriptionTrialing:
		return b.TrialEndsAt != nil && !now.After(*b.TrialEndsAt)
	case SubscriptionCanceled:
		return b.CurrentPeriodEnd != nil && !now.After(*b.CurrentPeriodEnd)
	default:
		return false
	}
}

// AdminEstablishmentSubscription is AdminEstablishmentSubscription: the subscription as
// the workspace sees it, with the manual grant's note and grantor. manualGrant goes last,
// as in Nest's toAdminDomain.
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

// AdminManualGrant is AdminManualGrant: the running manual plan, with the admin's note.
type AdminManualGrant struct {
	Plan          SubscriptionPlan `json:"plan"`
	ExpiresAt     *Time            `json:"expiresAt"`
	Reason        *string          `json:"reason"`
	GrantedByID   *string          `json:"grantedById"`
	GrantedByName *string          `json:"grantedByName"`
	GrantedAt     Time             `json:"grantedAt"`
}

// AdminView is EstablishmentSubscriptionMapper.toAdminDomain: View, plus the note and the
// grantor of a running manual grant.
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

// ManualPlanGrant is what an admin writes on the subscription to grant a plan by hand. A nil
// ExpiresAt grants it with no end.
type ManualPlanGrant struct {
	Plan        SubscriptionPlan
	ExpiresAt   *time.Time
	Reason      *string
	GrantedByID string
}

// AdminEstablishmentSettings is EstablishmentSettings in @coaster/common, as the backoffice
// sends it.
type AdminEstablishmentSettings struct {
	EstablishmentID string                `json:"establishmentId"`
	Modules         []EstablishmentModule `json:"modules"`
	Language        string                `json:"language"`
	MarkSoldOut     bool                  `json:"markSoldOut"`
	ConfiguredAt    *Time                 `json:"configuredAt"`
}

// Resolved is EstablishmentSettingsMapper.toDto: the stored row with its modules resolved
// and an unknown language read as the default one.
func (s AdminEstablishmentSettings) Resolved() AdminEstablishmentSettings {
	s.Modules = ResolveModules(s.Modules)
	s.Language = AsLanguage(s.Language)
	return s
}

// DefaultAdminEstablishmentSettings is what an establishment that never saved its settings
// runs with.
func DefaultAdminEstablishmentSettings(establishmentID string) AdminEstablishmentSettings {
	return AdminEstablishmentSettings{
		EstablishmentID: establishmentID,
		Modules:         ResolveModules(DefaultEstablishmentModules),
		Language:        DefaultLanguage,
	}
}

// AdminEstablishmentMember is AdminEstablishmentMember.
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

// AdminEstablishmentCounters is AdminEstablishmentCounters.
type AdminEstablishmentCounters struct {
	Categories        int `json:"categories"`
	Products          int `json:"products"`
	Tables            int `json:"tables"`
	Orders            int `json:"orders"`
	OrdersLast30Days  int `json:"ordersLast30Days"`
	RevenueLast30Days int `json:"revenueLast30Days"`
}

// AdminEstablishmentDetail is AdminEstablishmentDetail.
type AdminEstablishmentDetail struct {
	Establishment AdminEstablishmentSummary  `json:"establishment"`
	Settings      AdminEstablishmentSettings `json:"settings"`
	// Subscription is an AdminEstablishmentSubscription, or FreeSubscriptionView for an
	// establishment without a subscription row.
	Subscription   any                        `json:"subscription"`
	Members        []AdminEstablishmentMember `json:"members"`
	Counters       AdminEstablishmentCounters `json:"counters"`
	RecentActivity []AdminAuditLogEntry       `json:"recentActivity"`
}

// Platform metrics

// AdminPlatformMetrics is AdminPlatformMetrics: the numbers of the backoffice's front page.
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

// SubscriptionStatusCounts counts the subscription rows of each status, every status
// present and in the order of SubscriptionStatus.
type SubscriptionStatusCounts struct {
	Inactive int `json:"INACTIVE"`
	Trialing int `json:"TRIALING"`
	Active   int `json:"ACTIVE"`
	PastDue  int `json:"PAST_DUE"`
	Canceled int `json:"CANCELED"`
	Unpaid   int `json:"UNPAID"`
	Expired  int `json:"EXPIRED"`
}

// Set stores the count of one status.
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

// SubscriptionPlanCounts counts the subscription rows of each plan.
type SubscriptionPlanCounts struct {
	Free int `json:"FREE"`
	Pro  int `json:"PRO"`
}

// Set stores the count of one plan.
func (c *SubscriptionPlanCounts) Set(plan SubscriptionPlan, count int) {
	switch plan {
	case PlanFree:
		c.Free = count
	case PlanPro:
		c.Pro = count
	}
}
