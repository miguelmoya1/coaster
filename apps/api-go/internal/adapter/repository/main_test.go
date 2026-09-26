package repository

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

// The Prisma migrations own the schema until P5, so the tests apply the same ones.
const migrationsDir = "../../../../api/prisma/migrations"

// testPool is the pool every repository test uses. TestMain opens it.
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

	testPool, err = NewPool(ctx, databaseURL)
	if err != nil {
		log.Print(err)
		return 1
	}
	defer testPool.Close()

	if err := applyMigrations(ctx, testPool); err != nil {
		log.Print(err)
		return 1
	}

	return m.Run()
}

// applyMigrations runs every migration.sql of Prisma, in the order of their folders.
func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("reading %s: %w", migrationsDir, err)
	}

	var names []string
	for _, entry := range entries {
		if entry.IsDir() {
			names = append(names, entry.Name())
		}
	}
	slices.Sort(names)

	for _, name := range names {
		sql, err := os.ReadFile(filepath.Join(migrationsDir, name, "migration.sql"))
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", name, err)
		}

		// Without arguments pgx uses the simple protocol, which accepts several statements.
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("applying migration %s: %w", name, err)
		}
	}

	return nil
}

// resetDB empties every table, so each test starts from a clean database.
func resetDB(t *testing.T) {
	t.Helper()

	ctx := context.Background()

	rows, err := testPool.Query(ctx, `
		SELECT quote_ident(tablename)
		FROM pg_tables
		WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
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
