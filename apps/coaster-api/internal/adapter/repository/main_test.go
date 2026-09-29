package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

const migrationsDir = "../../../../database/migrations"

var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx := context.Background()

	container, err := postgres.Run(ctx, "postgres:18-alpine",
		postgres.WithDatabase("coaster"),
		postgres.WithUsername("admin"),
		postgres.WithPassword("admin"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		log.Printf("starting postgres: %v", err)
		return 1
	}
	defer func() {
		if err := testcontainers.TerminateContainer(container); err != nil {
			log.Printf("stopping postgres: %v", err)
		}
	}()

	databaseURL, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		log.Printf("reading the connection string: %v", err)
		return 1
	}

	if err := applyMigrations(ctx, databaseURL); err != nil {
		log.Print(err)
		return 1
	}

	testPool, err = NewPool(ctx, databaseURL)
	if err != nil {
		log.Print(err)
		return 1
	}
	defer testPool.Close()

	return m.Run()
}

func applyMigrations(ctx context.Context, databaseURL string) error {
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

func resetDB(t *testing.T) {
	t.Helper()

	ctx := context.Background()

	rows, err := testPool.Query(ctx, `
		SELECT quote_ident(tablename)
		FROM pg_tables
		WHERE schemaname = 'public' AND tablename <> 'goose_db_version'
	`)
	if err != nil {
		t.Fatalf("listing tables: %v", err)
	}

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			t.Fatalf("listing tables: %v", err)
		}
		tables = append(tables, table)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("listing tables: %v", err)
	}

	if len(tables) == 0 {
		return
	}

	if _, err := testPool.Exec(ctx, "TRUNCATE "+strings.Join(tables, ", ")+" CASCADE"); err != nil {
		t.Fatalf("emptying tables: %v", err)
	}
}
