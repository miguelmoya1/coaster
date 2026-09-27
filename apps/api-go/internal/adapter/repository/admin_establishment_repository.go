package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/admin_establishment/list.sql
	listAdminEstablishmentsQuery string
	//go:embed queries/admin_establishment/count.sql
	countAdminEstablishmentsQuery string
	//go:embed queries/admin_establishment/find_by_id.sql
	findAdminEstablishmentQuery string
	//go:embed queries/admin_establishment/list_members.sql
	listAdminEstablishmentMembersQuery string
	//go:embed queries/admin_establishment/counters.sql
	adminEstablishmentCountersQuery string
	//go:embed queries/admin_establishment/find_settings.sql
	findAdminEstablishmentSettingsQuery string
	//go:embed queries/admin_establishment/find_user_name.sql
	findAdminUserNameQuery string
	//go:embed queries/admin_establishment/rename.sql
	renameEstablishmentQuery string
	//go:embed queries/admin_establishment/upsert_modules.sql
	upsertEstablishmentModulesQuery string
	//go:embed queries/admin_establishment/grant_plan.sql
	grantEstablishmentPlanQuery string
	//go:embed queries/admin_establishment/revoke_plan.sql
	revokeEstablishmentPlanQuery string
)

// AdminEstablishmentRepository reads and changes any establishment for the backoffice.
type AdminEstablishmentRepository struct {
	pool *pgxpool.Pool
}

func NewAdminEstablishmentRepository(pool *pgxpool.Pool) *AdminEstablishmentRepository {
	return &AdminEstablishmentRepository{pool: pool}
}

func (r *AdminEstablishmentRepository) List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest, now time.Time) ([]domain.AdminEstablishmentRow, int, error) {
	search := nullIfEmpty(filter.Search)
	status := nullIfEmpty(string(filter.Status))
	source := nullIfEmpty(string(filter.BillingSource))
	now = now.UTC()

	rows, err := r.pool.Query(ctx, listAdminEstablishmentsQuery, search, status, source, now, page.PageSize, page.Offset())
	if err != nil {
		return nil, 0, err
	}
	establishments, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AdminEstablishmentRow, error) {
		return scanAdminEstablishment(row)
	})
	if err != nil {
		return nil, 0, err
	}

	var total int
	if err := r.pool.QueryRow(ctx, countAdminEstablishmentsQuery, search, status, source, now).Scan(&total); err != nil {
		return nil, 0, err
	}

	return establishments, total, nil
}

func (r *AdminEstablishmentRepository) FindByID(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentRow, error) {
	establishment, err := scanAdminEstablishment(r.pool.QueryRow(ctx, findAdminEstablishmentQuery, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &establishment, nil
}

func (r *AdminEstablishmentRepository) Members(ctx context.Context, establishmentID string) ([]domain.AdminEstablishmentMember, error) {
	rows, err := r.pool.Query(ctx, listAdminEstablishmentMembersQuery, establishmentID)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AdminEstablishmentMember, error) {
		var member domain.AdminEstablishmentMember
		var role string
		err := row.Scan(
			&member.ID, &member.UserID, &member.Name, &member.Email, &member.PhotoURL, &role, &member.Active, &member.JoinedAt,
		)
		member.Role = domain.EstablishmentRole(role)
		return member, err
	})
}

func (r *AdminEstablishmentRepository) Counters(ctx context.Context, establishmentID string, since time.Time) (domain.AdminEstablishmentCounters, error) {
	var counters domain.AdminEstablishmentCounters

	err := r.pool.QueryRow(ctx, adminEstablishmentCountersQuery, establishmentID, since.UTC()).Scan(
		&counters.Categories, &counters.Products, &counters.Tables, &counters.Orders,
		&counters.OrdersLast30Days, &counters.RevenueLast30Days,
	)
	return counters, err
}

func (r *AdminEstablishmentRepository) Settings(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentSettings, error) {
	settings, err := scanAdminSettings(r.pool.QueryRow(ctx, findAdminEstablishmentSettingsQuery, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *AdminEstablishmentRepository) UserName(ctx context.Context, userID string) (*string, error) {
	var name string

	err := r.pool.QueryRow(ctx, findAdminUserNameQuery, userID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &name, nil
}

func (r *AdminEstablishmentRepository) Rename(ctx context.Context, establishmentID, name string) error {
	_, err := r.pool.Exec(ctx, renameEstablishmentQuery, establishmentID, name, now())
	return err
}

func (r *AdminEstablishmentRepository) UpdateModules(ctx context.Context, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error) {
	values := make([]string, len(modules))
	for i, module := range modules {
		values[i] = string(module)
	}

	return scanAdminSettings(r.pool.QueryRow(ctx, upsertEstablishmentModulesQuery,
		uuid.NewV4().String(), establishmentID, values, now(),
	))
}

func (r *AdminEstablishmentRepository) GrantPlan(ctx context.Context, establishmentID string, grant domain.ManualPlanGrant) error {
	_, err := r.pool.Exec(ctx, grantEstablishmentPlanQuery,
		uuid.NewV4().String(), establishmentID, string(grant.Plan), utcOrNil(grant.ExpiresAt), grant.Reason,
		grant.GrantedByID, now(),
	)
	return err
}

func (r *AdminEstablishmentRepository) RevokePlan(ctx context.Context, establishmentID string) error {
	_, err := r.pool.Exec(ctx, revokeEstablishmentPlanQuery, establishmentID, now())
	return err
}

// scanAdminEstablishment reads a row of list.sql or find_by_id.sql: the establishment, its
// member count, its owner and, when there is one, its subscription row.
func scanAdminEstablishment(row pgx.Row) (domain.AdminEstablishmentRow, error) {
	var establishment domain.AdminEstablishmentRow
	var billing domain.AdminBilling
	var billingID, plan, status, manualPlan *string
	var seats *int
	var createdAt, updatedAt *time.Time

	err := row.Scan(
		&establishment.ID, &establishment.Name, &establishment.CreatedAt, &establishment.MemberCount,
		&establishment.OwnerName, &establishment.OwnerEmail,
		&billingID, &plan, &status, &billing.StripeCustomerID, &billing.StripeSubscriptionID,
		&billing.CurrentPeriodStart, &billing.CurrentPeriodEnd, &billing.TrialEndsAt, &billing.CanceledAt,
		&seats, &manualPlan, &billing.ManualGrantExpiresAt,
		&billing.ManualGrantReason, &billing.ManualGrantedByID, &billing.ManualGrantedAt, &createdAt, &updatedAt,
	)
	if err != nil || billingID == nil {
		return establishment, err
	}

	billing.ID = *billingID
	billing.EstablishmentID = establishment.ID
	billing.Plan = domain.SubscriptionPlan(*plan)
	billing.Status = domain.SubscriptionStatus(*status)
	billing.Seats = *seats
	billing.CreatedAt = *createdAt
	billing.UpdatedAt = *updatedAt
	if manualPlan != nil {
		granted := domain.SubscriptionPlan(*manualPlan)
		billing.ManualPlan = &granted
	}

	establishment.Billing = &billing
	return establishment, nil
}

// scanAdminSettings reads a row of EstablishmentSettings as it is stored.
func scanAdminSettings(row pgx.Row) (domain.AdminEstablishmentSettings, error) {
	var settings domain.AdminEstablishmentSettings
	var modules []string
	var configuredAt *time.Time

	err := row.Scan(&settings.EstablishmentID, &modules, &settings.Language, &settings.MarkSoldOut, &configuredAt)

	settings.Modules = make([]domain.EstablishmentModule, len(modules))
	for i, module := range modules {
		settings.Modules[i] = domain.EstablishmentModule(module)
	}
	if configuredAt != nil {
		settings.ConfiguredAt = &domain.Time{Time: *configuredAt}
	}

	return settings, err
}
