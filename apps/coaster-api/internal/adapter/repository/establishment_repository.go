package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/establishment/insert.sql
	insertEstablishmentQuery string
	//go:embed queries/establishment/insert_owner.sql
	insertEstablishmentOwnerQuery string
	//go:embed queries/establishment/insert_trial_subscription.sql
	insertTrialSubscriptionQuery string
	//go:embed queries/establishment/insert_settings.sql
	insertEstablishmentSettingsQuery string
	//go:embed queries/establishment/list_for_member.sql
	listEstablishmentsForMemberQuery string
	//go:embed queries/establishment/find_by_id.sql
	findEstablishmentByIDQuery string
	//go:embed queries/establishment/find_settings.sql
	findEstablishmentSettingsQuery string
	//go:embed queries/establishment/save_settings.sql
	saveEstablishmentSettingsQuery string
)

type EstablishmentRepository struct {
	pool *pgxpool.Pool
}

func NewEstablishmentRepository(pool *pgxpool.Pool) *EstablishmentRepository {
	return &EstablishmentRepository{pool: pool}
}

func (r *EstablishmentRepository) Create(ctx context.Context, input domain.NewEstablishment) (domain.Establishment, error) {
	createdAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Establishment{}, err
	}
	defer tx.Rollback(ctx)

	created, err := scanEstablishment(tx.QueryRow(ctx, insertEstablishmentQuery, uuid.NewV4().String(), input.Name, createdAt))
	if err != nil {
		return domain.Establishment{}, err
	}

	_, err = tx.Exec(ctx, insertEstablishmentOwnerQuery, uuid.NewV4().String(), input.OwnerID, created.ID, createdAt)
	if err != nil {
		return domain.Establishment{}, err
	}

	_, err = tx.Exec(ctx, insertTrialSubscriptionQuery, uuid.NewV4().String(), created.ID, input.TrialEndsAt.UTC(), createdAt)
	if err != nil {
		return domain.Establishment{}, err
	}

	_, err = tx.Exec(ctx, insertEstablishmentSettingsQuery,
		uuid.NewV4().String(), created.ID, moduleNames(input.Modules), input.Language, createdAt,
	)
	if err != nil {
		return domain.Establishment{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Establishment{}, err
	}

	return *created, nil
}

func (r *EstablishmentRepository) ListForMember(ctx context.Context, userID string) ([]domain.Establishment, error) {
	rows, err := r.pool.Query(ctx, listEstablishmentsForMemberQuery, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	establishments := []domain.Establishment{}
	for rows.Next() {
		establishment, err := scanEstablishment(rows)
		if err != nil {
			return nil, err
		}
		establishments = append(establishments, *establishment)
	}

	return establishments, rows.Err()
}

func (r *EstablishmentRepository) FindByID(ctx context.Context, establishmentID string) (*domain.Establishment, error) {
	establishment, err := scanEstablishment(r.pool.QueryRow(ctx, findEstablishmentByIDQuery, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return establishment, err
}

func (r *EstablishmentRepository) FindSettings(ctx context.Context, establishmentID string) (*domain.EstablishmentSettings, error) {
	settings, err := scanEstablishmentSettings(r.pool.QueryRow(ctx, findEstablishmentSettingsQuery, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return settings, err
}

func (r *EstablishmentRepository) SaveSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error) {
	settings, err := scanEstablishmentSettings(r.pool.QueryRow(ctx, saveEstablishmentSettingsQuery,
		uuid.NewV4().String(), establishmentID, moduleNames(changes.Modules), changes.Language, changes.MarkSoldOut, now(),
	))
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}
	return *settings, nil
}

func scanEstablishment(row pgx.Row) (*domain.Establishment, error) {
	var establishment domain.Establishment
	err := row.Scan(&establishment.ID, &establishment.Name, &establishment.CreatedAt, &establishment.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &establishment, nil
}

func scanEstablishmentSettings(row pgx.Row) (*domain.EstablishmentSettings, error) {
	var settings domain.EstablishmentSettings
	var modules []string
	var configuredAt *time.Time

	err := row.Scan(&settings.EstablishmentID, &modules, &settings.Language, &settings.MarkSoldOut, &configuredAt)
	if err != nil {
		return nil, err
	}

	settings.Modules = make([]domain.EstablishmentModule, 0, len(modules))
	for _, module := range modules {
		settings.Modules = append(settings.Modules, domain.EstablishmentModule(module))
	}
	settings.ConfiguredAt = timeOrNil(configuredAt)

	return &settings, nil
}

func moduleNames(modules []domain.EstablishmentModule) []string {
	names := make([]string, 0, len(modules))
	for _, module := range modules {
		names = append(names, string(module))
	}
	return names
}
