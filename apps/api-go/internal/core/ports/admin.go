package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// What the backoffice of the platform (admin) needs from the database. The finders return
// nil with a nil error when there is no row, and the lists return the page and the total.

// AdminAuditRepository keeps the backoffice log (AdminAuditLog).
type AdminAuditRepository interface {
	Record(ctx context.Context, entry domain.AdminAuditEntry) error
	// List lists the log newest first.
	List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) ([]domain.AdminAuditLogEntry, int, error)
	// RecentFor lists the latest entries about one target, newest first.
	RecentFor(ctx context.Context, targetType, targetID string, limit int) ([]domain.AdminAuditLogEntry, error)
}

// BetaTesterRepository keeps the beta allowlist (BetaTester).
type BetaTesterRepository interface {
	// List lists the addresses newest first, searching the address and the note. The
	// testers come without their account (UserID and SignedUpAt are nil).
	List(ctx context.Context, search string, page domain.PageRequest) ([]domain.BetaTester, int, error)
	// FindSignUps finds the accounts opened with any of the addresses.
	FindSignUps(ctx context.Context, emails []string) ([]domain.BetaSignUp, error)
	FindByID(ctx context.Context, id string) (*domain.BetaTester, error)
	FindByEmail(ctx context.Context, email string) (*domain.BetaTester, error)
	// Add returns the id of the new tester.
	Add(ctx context.Context, email string, note *string, invitedByID string) (string, error)
	Remove(ctx context.Context, id string) error
}

// AdminUserRepository reads and changes the users of the platform.
type AdminUserRepository interface {
	// List lists the users newest first.
	List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) ([]domain.AdminUserSummary, int, error)
	FindByID(ctx context.Context, userID string) (*domain.AdminUserSummary, error)
	// Memberships lists the establishments the user belongs to (removed ones left out),
	// newest first.
	Memberships(ctx context.Context, userID string) ([]domain.AdminUserMembership, error)
	// CountActiveAdmins counts the active platform admins.
	CountActiveAdmins(ctx context.Context) (int, error)
	Update(ctx context.Context, userID string, changes domain.AdminUserChanges) error
}

// AdminEstablishmentRepository reads and changes any establishment of the platform.
type AdminEstablishmentRepository interface {
	// List lists the establishments newest first. now decides which manual grants are live.
	List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest, now time.Time) ([]domain.AdminEstablishmentRow, int, error)
	FindByID(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentRow, error)
	// Members lists the members not removed, owners first and then by seniority.
	Members(ctx context.Context, establishmentID string) ([]domain.AdminEstablishmentMember, error)
	// Counters counts the catalogue, the tables and the orders; the last two counters start
	// at since.
	Counters(ctx context.Context, establishmentID string, since time.Time) (domain.AdminEstablishmentCounters, error)
	// Settings reads the stored settings as they are (modules not resolved).
	Settings(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentSettings, error)
	// UserName is the name of a user, for the admin who granted a plan.
	UserName(ctx context.Context, userID string) (*string, error)
	Rename(ctx context.Context, establishmentID, name string) error
	// UpdateModules saves the modules, creating the settings if there are none, without
	// marking the establishment as configured. It returns the stored settings.
	UpdateModules(ctx context.Context, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error)
	// GrantPlan writes a manual grant on the subscription, creating the row if there is none.
	// The Stripe columns stay as they are.
	GrantPlan(ctx context.Context, establishmentID string, grant domain.ManualPlanGrant) error
	// RevokePlan clears the manual grant.
	RevokePlan(ctx context.Context, establishmentID string) error
}

// AdminMetricsRepository counts what the backoffice's front page shows.
type AdminMetricsRepository interface {
	// Collect counts everything at now, with the windows of the last 7 and 30 days.
	Collect(ctx context.Context, now, last7Days, last30Days time.Time) (domain.AdminPlatformMetrics, error)
}
