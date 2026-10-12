package testdb

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

type Database struct {
	URL       string
	Pool      *pgxpool.Pool
	container *postgres.PostgresContainer
}

func Start(ctx context.Context, migrationsDir string) (*Database, error) {
	container, err := postgres.Run(ctx, "postgres:18-alpine",
		postgres.WithDatabase("coaster"),
		postgres.WithUsername("admin"),
		postgres.WithPassword("admin"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, fmt.Errorf("starting postgres: %w", err)
	}

	database := &Database{container: container}

	database.URL, err = container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		database.Close()
		return nil, fmt.Errorf("reading the connection string: %w", err)
	}

	if err := migrate(ctx, database.URL, migrationsDir); err != nil {
		database.Close()
		return nil, err
	}

	database.Pool, err = pgxpool.New(ctx, database.URL)
	if err != nil {
		database.Close()
		return nil, fmt.Errorf("opening the pool: %w", err)
	}

	return database, nil
}

func (d *Database) Close() {
	if d.Pool != nil {
		d.Pool.Close()
	}
	_ = testcontainers.TerminateContainer(d.container)
}

func (d *Database) Reset(ctx context.Context) error {
	rows, err := d.Pool.Query(ctx, `
		SELECT quote_ident(tablename)
		FROM pg_tables
		WHERE schemaname = 'public' AND tablename NOT LIKE 'goose\_%'
	`)
	if err != nil {
		return fmt.Errorf("listing tables: %w", err)
	}

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return fmt.Errorf("listing tables: %w", err)
		}
		tables = append(tables, table)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("listing tables: %w", err)
	}

	if len(tables) == 0 {
		return nil
	}

	if _, err := d.Pool.Exec(ctx, "TRUNCATE "+strings.Join(tables, ", ")+" CASCADE"); err != nil {
		return fmt.Errorf("emptying tables: %w", err)
	}

	return nil
}

func migrate(ctx context.Context, databaseURL, migrationsDir string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	provider, err := goose.NewProvider(goose.DialectPostgres, db, os.DirFS(migrationsDir))
	if err != nil {
		return fmt.Errorf("reading the migrations of apps/database: %w", err)
	}

	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("applying the migrations: %w", err)
	}

	return nil
}
