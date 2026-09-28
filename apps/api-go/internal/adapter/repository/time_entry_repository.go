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
	//go:embed queries/time_entry/find_by_workday_range.sql
	findTimeEntriesByWorkdayRangeQuery string
	//go:embed queries/time_entry/find_latest_workday_date.sql
	findLatestWorkdayDateQuery string
	//go:embed queries/time_entry/find_by_user_and_workday.sql
	findTimeEntriesByUserAndWorkdayQuery string
	//go:embed queries/time_entry/find_by_roots.sql
	findTimeEntriesByRootsQuery string
	//go:embed queries/time_entry/find_chain.sql
	findTimeEntryChainQuery string
	//go:embed queries/time_entry/find_by_id.sql
	findTimeEntryByIDQuery string
	//go:embed queries/time_entry/find_in_establishment.sql
	findTimeEntryInEstablishmentQuery string
	//go:embed queries/time_entry/find_superseding_id.sql
	findSupersedingTimeEntryIDQuery string
	//go:embed queries/time_entry/lock_chain.sql
	lockTimeEntryChainQuery string
	//go:embed queries/time_entry/find_head.sql
	findTimeEntryChainHeadQuery string
	//go:embed queries/time_entry/insert.sql
	insertTimeEntryQuery string
	//go:embed queries/time_entry/find_active_member.sql
	findActiveTimeEntryMemberQuery string
	//go:embed queries/time_entry/insert_admin_audit.sql
	insertTimeEntryAuditQuery string
)

type TimeEntryRepository struct {
	pool *pgxpool.Pool
}

func NewTimeEntryRepository(pool *pgxpool.Pool) *TimeEntryRepository {
	return &TimeEntryRepository{pool: pool}
}

func scanTimeEntry(row pgx.Row) (domain.TimeEntryRow, error) {
	var entry domain.TimeEntryRow
	var entryType, action, source string

	err := row.Scan(
		&entry.ID, &entry.EstablishmentID, &entry.UserID, &entry.UserName, &entry.UserSnapshot, &entry.ShiftID,
		&entryType, &action, &entry.OccurredAt, &entry.RecordedAt, &entry.WorkdayDate, &source,
		&entry.Latitude, &entry.Longitude, &entry.RootID, &entry.SupersedesID, &entry.ActorID, &entry.ActorName,
		&entry.Reason, &entry.Sequence, &entry.PrevHash, &entry.Hash,
	)
	entry.Type = domain.TimeEntryType(entryType)
	entry.Action = domain.TimeEntryAction(action)
	entry.Source = domain.TimeEntrySource(source)

	return entry, err
}

func (r *TimeEntryRepository) list(ctx context.Context, query string, args ...any) ([]domain.TimeEntryRow, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.TimeEntryRow, error) {
		return scanTimeEntry(row)
	})
}

func (r *TimeEntryRepository) FindByWorkdayRange(ctx context.Context, establishmentID string, from, to time.Time, userID string) ([]domain.TimeEntryRow, error) {
	return r.list(ctx, findTimeEntriesByWorkdayRangeQuery,
		establishmentID, domain.FormatWorkdayDate(from), domain.FormatWorkdayDate(to), nullIfEmpty(userID),
	)
}

func (r *TimeEntryRepository) FindLatestWorkday(ctx context.Context, establishmentID, userID string) ([]domain.TimeEntryRow, error) {
	var latest time.Time

	err := r.pool.QueryRow(ctx, findLatestWorkdayDateQuery, establishmentID, userID).Scan(&latest)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return r.list(ctx, findTimeEntriesByUserAndWorkdayQuery, establishmentID, userID, domain.FormatWorkdayDate(latest))
}

func (r *TimeEntryRepository) FindByRoots(ctx context.Context, rootIDs []string) ([]domain.TimeEntryRow, error) {
	return r.list(ctx, findTimeEntriesByRootsQuery, rootIDs)
}

func (r *TimeEntryRepository) FindChain(ctx context.Context, establishmentID string) ([]domain.TimeEntryRow, error) {
	return r.list(ctx, findTimeEntryChainQuery, establishmentID)
}

func (r *TimeEntryRepository) FindCurrentByID(ctx context.Context, establishmentID, id string) (*domain.TimeEntryRow, error) {
	entry, err := scanTimeEntry(r.pool.QueryRow(ctx, findTimeEntryInEstablishmentQuery, id, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var supersededBy string
	err = r.pool.QueryRow(ctx, findSupersedingTimeEntryIDQuery, id).Scan(&supersededBy)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return nil, err
	default:
		entry.SupersededByID = &supersededBy
	}

	return &entry, nil
}

type chainHead struct {
	sequence int64
	hash     string
}

func (r *TimeEntryRepository) Append(ctx context.Context, input domain.AppendTimeEntry) (*domain.TimeEntryRow, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, lockTimeEntryChainQuery, input.EstablishmentID); err != nil {
		return nil, err
	}

	head := chainHead{hash: domain.GenesisHash}
	err = tx.QueryRow(ctx, findTimeEntryChainHeadQuery, input.EstablishmentID).Scan(&head.sequence, &head.hash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	id := uuid.NewV4().String()
	rootID := input.RootID
	if rootID == "" {
		rootID = id
	}

	payload := domain.ChainPayload{
		ID:              id,
		EstablishmentID: input.EstablishmentID,
		UserID:          input.UserID,
		RootID:          rootID,
		Type:            input.Type,
		Action:          input.Action,
		OccurredAt:      input.OccurredAt.UTC().Truncate(time.Millisecond),
		RecordedAt:      now().Truncate(time.Millisecond),
		WorkdayDate:     input.WorkdayDate,
		UserSnapshot:    input.UserSnapshot,
		Source:          input.Source,
		SupersedesID:    input.SupersedesID,
		ActorID:         input.ActorID,
		Reason:          input.Reason,
		Sequence:        head.sequence + 1,
	}
	hash := domain.HashTimeEntry(payload, head.hash)

	_, err = tx.Exec(ctx, insertTimeEntryQuery,
		payload.ID, payload.EstablishmentID, payload.UserID, payload.UserSnapshot, string(payload.Type),
		string(payload.Action), payload.OccurredAt, payload.RecordedAt, domain.FormatWorkdayDate(payload.WorkdayDate),
		string(payload.Source), input.Latitude, input.Longitude, payload.RootID, payload.SupersedesID,
		payload.ActorID, payload.Reason, payload.Sequence, head.hash, hash,
	)
	if err != nil {
		return nil, err
	}

	created, err := scanTimeEntry(tx.QueryRow(ctx, findTimeEntryByIDQuery, id))
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &created, nil
}

func (r *TimeEntryRepository) FindActiveMember(ctx context.Context, establishmentID, userID string) (*domain.TimeEntryMember, error) {
	var member domain.TimeEntryMember
	var role string

	err := r.pool.QueryRow(ctx, findActiveTimeEntryMemberQuery, establishmentID, userID).Scan(
		&member.UserID, &member.Name, &member.Email, &role,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	member.Role = domain.AsEstablishmentRole(role)
	return &member, nil
}

func (r *TimeEntryRepository) RecordAudit(ctx context.Context, audit domain.TimeEntryAudit) error {
	_, err := r.pool.Exec(ctx, insertTimeEntryAuditQuery,
		uuid.NewV4().String(), audit.ActorID, audit.Action, domain.AuditTargetTimeEntry, audit.TargetID,
		audit.TargetLabel, audit.Reason, audit.Metadata, now(),
	)
	return err
}
