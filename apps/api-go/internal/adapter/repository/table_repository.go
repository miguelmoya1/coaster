package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/table/list_of.sql
	listTablesQuery string
	//go:embed queries/table/find_by_id.sql
	findTableByIDQuery string
	//go:embed queries/table/insert.sql
	insertTableQuery string
	//go:embed queries/table/rename.sql
	renameTableQuery string
	//go:embed queries/table/delete.sql
	deleteTableQuery string
	//go:embed queries/table/set_status.sql
	setTableStatusQuery string
)

// TableRepository reads and writes the "Table" rows.
type TableRepository struct {
	pool *pgxpool.Pool
}

func NewTableRepository(pool *pgxpool.Pool) *TableRepository {
	return &TableRepository{pool: pool}
}

func (r *TableRepository) ListOf(ctx context.Context, establishmentID string) ([]domain.Table, error) {
	rows, err := r.pool.Query(ctx, listTablesQuery, establishmentID)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Table, error) {
		return scanTable(row)
	})
}

func (r *TableRepository) FindByID(ctx context.Context, tableID string) (*domain.Table, error) {
	return findTable(ctx, r.pool, tableID)
}

func (r *TableRepository) Create(ctx context.Context, establishmentID, name string) (domain.Table, error) {
	return scanTable(r.pool.QueryRow(ctx, insertTableQuery, uuid.NewV4().String(), name, establishmentID, now()))
}

func (r *TableRepository) Rename(ctx context.Context, tableID, name string) (domain.Table, error) {
	return scanTable(r.pool.QueryRow(ctx, renameTableQuery, tableID, name, now()))
}

func (r *TableRepository) Delete(ctx context.Context, tableID string) error {
	return execExisting(ctx, r.pool, deleteTableQuery, tableID)
}

// findTable reads a table in the pool or in a transaction. It returns nil when there is none.
func findTable(ctx context.Context, db querier, tableID string) (*domain.Table, error) {
	table, err := scanTable(db.QueryRow(ctx, findTableByIDQuery, tableID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &table, nil
}

// setTableStatus marks a table FREE or OCCUPIED. The orders do it inside their transactions.
func setTableStatus(ctx context.Context, db querier, tableID string, status domain.TableStatus) error {
	return execExisting(ctx, db, setTableStatusQuery, tableID, status, now())
}

// scanTable reads the columns every table query returns.
func scanTable(row pgx.Row) (domain.Table, error) {
	var table domain.Table
	err := row.Scan(&table.ID, &table.EstablishmentID, &table.Name, &table.Status, &table.CreatedAt, &table.UpdatedAt)
	return table, err
}
