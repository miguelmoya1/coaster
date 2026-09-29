package repository

import (
	"context"
	"log"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

var (
	testPool        *pgxpool.Pool
	testDatabaseURL string
)

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

	testDatabaseURL, err = container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		log.Printf("reading the connection string: %v", err)
		return 1
	}

	if err := Migrate(ctx, testDatabaseURL); err != nil {
		log.Print(err)
		return 1
	}

	testPool, err = NewPool(ctx, testDatabaseURL)
	if err != nil {
		log.Print(err)
		return 1
	}
	defer testPool.Close()

	return m.Run()
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
