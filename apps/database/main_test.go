package database

import (
	"context"
	"log"
	"log/slog"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

var (
	testContainer   *postgres.PostgresContainer
	testDatabaseURL string
	testPool        *pgxpool.Pool
)

func TestMain(m *testing.M) {
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx := context.Background()
	slog.SetDefault(slog.New(slog.DiscardHandler))

	var err error
	testContainer, err = postgres.Run(ctx, "postgres:18-alpine",
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
		if err := testcontainers.TerminateContainer(testContainer); err != nil {
			log.Printf("stopping postgres: %v", err)
		}
	}()

	testDatabaseURL, err = testContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		log.Printf("reading the connection string: %v", err)
		return 1
	}

	if err := Migrate(ctx, testDatabaseURL); err != nil {
		log.Printf("migrating an empty database: %v", err)
		return 1
	}

	testPool, err = pgxpool.New(ctx, testDatabaseURL)
	if err != nil {
		log.Print(err)
		return 1
	}
	defer testPool.Close()

	return m.Run()
}
