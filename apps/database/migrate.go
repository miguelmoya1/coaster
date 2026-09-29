package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"path"
	"slices"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	goosedb "github.com/pressly/goose/v3/database"
	"github.com/pressly/goose/v3/lock"
)

var (
	//go:embed migrations/*.sql
	migrationFiles embed.FS
	//go:embed queries/lock.sql
	migrationLockQuery string
	//go:embed queries/history_tables.sql
	migrationHistoryTablesQuery string
	//go:embed queries/prisma_history.sql
	prismaHistoryQuery string
)

func Migrate(ctx context.Context, databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("opening the database: %w", err)
	}
	defer db.Close()

	provider, store, err := newMigrationProvider(db)
	if err != nil {
		return err
	}

	if err := adoptPrismaHistory(ctx, db, store, provider.ListSources()); err != nil {
		return err
	}

	results, err := provider.Up(ctx)
	for _, result := range results {
		slog.Info("migration applied", "migration", result.Source.Path, "duration", result.Duration.String())
	}
	if err != nil {
		return fmt.Errorf("applying the migrations: %w", err)
	}

	slog.Info("the database is up to date", "applied", len(results))
	return nil
}

func newMigrationProvider(db *sql.DB) (*goose.Provider, goosedb.Store, error) {
	migrations, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		return nil, nil, err
	}

	store, err := goosedb.NewStore(goosedb.DialectPostgres, goose.DefaultTablename)
	if err != nil {
		return nil, nil, err
	}

	locker, err := lock.NewPostgresTableLocker()
	if err != nil {
		return nil, nil, err
	}

	provider, err := goose.NewProvider(goose.DialectCustom, db, migrations, goose.WithStore(store), goose.WithLocker(locker))
	if err != nil {
		return nil, nil, fmt.Errorf("reading the migrations: %w", err)
	}

	return provider, store, nil
}

func adoptPrismaHistory(ctx context.Context, db *sql.DB, store goosedb.Store, sources []*goose.Source) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, migrationLockQuery, lock.DefaultLockID); err != nil {
		return fmt.Errorf("locking the migrations: %w", err)
	}

	var gooseHistory, prismaHistory bool
	if err := tx.QueryRowContext(ctx, migrationHistoryTablesQuery, store.Tablename()).Scan(&gooseHistory, &prismaHistory); err != nil {
		return fmt.Errorf("looking for the migration history: %w", err)
	}
	if gooseHistory || !prismaHistory {
		return nil
	}

	versions, err := prismaVersions(ctx, tx, sources)
	if err != nil {
		return err
	}

	if err := store.CreateVersionTable(ctx, tx); err != nil {
		return fmt.Errorf("creating the goose history: %w", err)
	}
	for _, version := range append([]int64{0}, versions...) {
		if err := store.Insert(ctx, tx, goosedb.InsertRequest{Version: version}); err != nil {
			return fmt.Errorf("recording migration %d: %w", version, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	slog.Info("goose takes over the migrations Prisma applied", "migrations", len(versions))
	return nil
}

func prismaVersions(ctx context.Context, tx *sql.Tx, sources []*goose.Source) ([]int64, error) {
	versionOf := make(map[string]int64, len(sources))
	for _, source := range sources {
		versionOf[strings.TrimSuffix(path.Base(source.Path), ".sql")] = source.Version
	}

	rows, err := tx.QueryContext(ctx, prismaHistoryQuery)
	if err != nil {
		return nil, fmt.Errorf("reading the Prisma history: %w", err)
	}
	defer rows.Close()

	var versions []int64
	for rows.Next() {
		var name string
		var finished, rolledBack bool
		if err := rows.Scan(&name, &finished, &rolledBack); err != nil {
			return nil, err
		}

		if rolledBack {
			continue
		}
		if !finished {
			return nil, fmt.Errorf("migration %s was left half applied by Prisma: resolve it before goose takes over", name)
		}

		version, ok := versionOf[name]
		if !ok {
			return nil, fmt.Errorf("migration %s was applied by Prisma but is not among the goose migrations", name)
		}
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	slices.Sort(versions)
	return slices.Compact(versions), nil
}
