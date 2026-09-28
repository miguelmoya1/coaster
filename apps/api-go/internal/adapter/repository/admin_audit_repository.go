package repository

import (
	"context"
	_ "embed"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/admin_audit/insert.sql
	insertAdminAuditQuery string
	//go:embed queries/admin_audit/list.sql
	listAdminAuditQuery string
	//go:embed queries/admin_audit/count.sql
	countAdminAuditQuery string
	//go:embed queries/admin_audit/list_recent_for_target.sql
	listRecentAdminAuditQuery string
)

type AdminAuditRepository struct {
	pool *pgxpool.Pool
}

func NewAdminAuditRepository(pool *pgxpool.Pool) *AdminAuditRepository {
	return &AdminAuditRepository{pool: pool}
}

func (r *AdminAuditRepository) Record(ctx context.Context, entry domain.AdminAuditEntry) error {
	_, err := r.pool.Exec(ctx, insertAdminAuditQuery,
		uuid.NewV4().String(), entry.ActorID, entry.Action, entry.TargetType, entry.TargetID,
		entry.TargetLabel, entry.Reason, entry.Metadata, now(),
	)
	return err
}

func (r *AdminAuditRepository) List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) ([]domain.AdminAuditLogEntry, int, error) {
	targetType, targetID, action := nullIfEmpty(filter.TargetType), nullIfEmpty(filter.TargetID), nullIfEmpty(filter.Action)

	rows, err := r.pool.Query(ctx, listAdminAuditQuery, targetType, targetID, action, page.PageSize, page.Offset())
	if err != nil {
		return nil, 0, err
	}
	entries, err := pgx.CollectRows(rows, scanAdminAuditEntry)
	if err != nil {
		return nil, 0, err
	}

	var total int
	if err := r.pool.QueryRow(ctx, countAdminAuditQuery, targetType, targetID, action).Scan(&total); err != nil {
		return nil, 0, err
	}

	return entries, total, nil
}

func (r *AdminAuditRepository) RecentFor(ctx context.Context, targetType, targetID string, limit int) ([]domain.AdminAuditLogEntry, error) {
	rows, err := r.pool.Query(ctx, listRecentAdminAuditQuery, targetType, targetID, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAdminAuditEntry)
}

func scanAdminAuditEntry(row pgx.CollectableRow) (domain.AdminAuditLogEntry, error) {
	var entry domain.AdminAuditLogEntry
	var metadata []byte

	err := row.Scan(
		&entry.ID, &entry.Action, &entry.TargetType, &entry.TargetID, &entry.TargetLabel, &entry.Reason,
		&metadata, &entry.CreatedAt, &entry.ActorID, &entry.ActorName, &entry.ActorEmail,
	)
	entry.Metadata = metadata

	return entry, err
}
