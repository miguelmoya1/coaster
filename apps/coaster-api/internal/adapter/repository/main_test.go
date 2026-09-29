package repository

import (
	"context"
	"log"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/testdb"
)

const migrationsDir = "../../../../database/migrations"

var (
	testDB   *testdb.Database
	testPool *pgxpool.Pool
)

func TestMain(m *testing.M) {
	os.Exit(run(m))
}

func run(m *testing.M) int {
	var err error
	testDB, err = testdb.Start(context.Background(), migrationsDir)
	if err != nil {
		log.Print(err)
		return 1
	}
	defer testDB.Close()

	testPool = testDB.Pool
	return m.Run()
}

func resetDB(t *testing.T) {
	t.Helper()

	if err := testDB.Reset(context.Background()); err != nil {
		t.Fatal(err)
	}
}
