package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type AdminAuditRepository interface {
	Record(ctx context.Context, entry domain.AdminAuditEntry) error

	List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) ([]domain.AdminAuditLogEntry, int, error)

	RecentFor(ctx context.Context, targetType, targetID string, limit int) ([]domain.AdminAuditLogEntry, error)
}

type BetaTesterRepository interface {
	List(ctx context.Context, search string, page domain.PageRequest) ([]domain.BetaTester, int, error)

	FindSignUps(ctx context.Context, emails []string) ([]domain.BetaSignUp, error)
	FindByID(ctx context.Context, id string) (*domain.BetaTester, error)
	FindByEmail(ctx context.Context, email string) (*domain.BetaTester, error)

	Add(ctx context.Context, email string, note *string, invitedByID string) (string, error)
	Remove(ctx context.Context, id string) error
}

type AdminUserRepository interface {
	List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) ([]domain.AdminUserSummary, int, error)
	FindByID(ctx context.Context, userID string) (*domain.AdminUserSummary, error)

	Memberships(ctx context.Context, userID string) ([]domain.AdminUserMembership, error)

	CountActiveAdmins(ctx context.Context) (int, error)
	Update(ctx context.Context, userID string, changes domain.AdminUserChanges) error
}

type AdminEstablishmentRepository interface {
	List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest, now time.Time) ([]domain.AdminEstablishmentRow, int, error)
	FindByID(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentRow, error)

	Members(ctx context.Context, establishmentID string) ([]domain.AdminEstablishmentMember, error)

	Counters(ctx context.Context, establishmentID string, since time.Time) (domain.AdminEstablishmentCounters, error)

	Settings(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentSettings, error)

	UserName(ctx context.Context, userID string) (*string, error)
	Rename(ctx context.Context, establishmentID, name string) error

	UpdateModules(ctx context.Context, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error)

	GrantPlan(ctx context.Context, establishmentID string, grant domain.ManualPlanGrant) error

	RevokePlan(ctx context.Context, establishmentID string) error
}

type AdminMetricsRepository interface {
	Collect(ctx context.Context, now, last7Days, last30Days time.Time) (domain.AdminPlatformMetrics, error)
}

type BetaTesterService interface {
	List(ctx context.Context, search string, page domain.PageRequest) (domain.AdminBetaTesters, error)
	Add(ctx context.Context, actorID, email string, note *string) error
	Remove(ctx context.Context, actorID, betaTesterID string) error
}

type AdminEstablishmentService interface {
	List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest) (domain.Paginated[domain.AdminEstablishmentSummary], error)
	Detail(ctx context.Context, establishmentID string) (domain.AdminEstablishmentDetail, error)
	Rename(ctx context.Context, actorID, establishmentID, name string) error
	UpdateModules(ctx context.Context, actorID, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error)
	GrantPlan(ctx context.Context, actorID, establishmentID string, input domain.GrantPlanInput) error
	RevokePlan(ctx context.Context, actorID, establishmentID string, reason *string) error
}

type AdminMetricsService interface {
	Overview(ctx context.Context) (domain.AdminPlatformMetrics, error)
}

type AdminAuditService interface {
	List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) (domain.Paginated[domain.AdminAuditLogEntry], error)
}

type AdminUserService interface {
	List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) (domain.Paginated[domain.AdminUserSummary], error)
	Detail(ctx context.Context, userID string) (domain.AdminUserDetail, error)
	Update(ctx context.Context, actorID, userID string, changes domain.AdminUserChanges) error
}
