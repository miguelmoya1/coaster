package database

import (
	"context"
	"io/fs"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const prismaMigrationsDir = "../api/prisma/migrations"

const prismaMigrationsTable = `
	CREATE TABLE "_prisma_migrations" (
		"id" VARCHAR(36) PRIMARY KEY NOT NULL,
		"checksum" VARCHAR(64) NOT NULL,
		"finished_at" TIMESTAMPTZ,
		"migration_name" VARCHAR(255) NOT NULL,
		"logs" TEXT,
		"rolled_back_at" TIMESTAMPTZ,
		"started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
		"applied_steps_count" INTEGER NOT NULL DEFAULT 0
	)`

func TestMigrationsAreThePrismaOnes(t *testing.T) {
	entries, err := os.ReadDir(prismaMigrationsDir)
	if err != nil {
		t.Fatal(err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		prisma, err := os.ReadFile(filepath.Join(prismaMigrationsDir, entry.Name(), "migration.sql"))
		if err != nil {
			t.Fatal(err)
		}

		copied, err := migrationFiles.ReadFile("migrations/" + entry.Name() + ".sql")
		if err != nil {
			t.Errorf("%s is not among the goose migrations", entry.Name())
			continue
		}

		want := "-- +goose Up\n-- +goose StatementBegin\n" + strings.TrimSuffix(string(prisma), "\n") + "\n-- +goose StatementEnd\n"
		if string(copied) != want {
			t.Errorf("%s is not a verbatim copy of its Prisma migration", entry.Name())
		}
	}
}

func TestMigrateTakesOverThePrismaHistory(t *testing.T) {
	ctx := context.Background()
	name, databaseURL, pool := newDatabase(t)

	names := migrationNames(t)
	appliedByPrisma := names[:len(names)-2]

	mustExec(t, pool, prismaMigrationsTable)
	for i, name := range appliedByPrisma {
		sql, err := migrationFiles.ReadFile("migrations/" + name + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		mustExec(t, pool, string(sql))
		mustExec(t, pool, `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ($1, '', $2, now(), 1)`,
			strconv.Itoa(i), name)
	}

	if err := Migrate(ctx, databaseURL); err != nil {
		t.Fatalf("taking over: %v", err)
	}
	if err := Migrate(ctx, databaseURL); err != nil {
		t.Fatalf("a second run: %v", err)
	}

	var versions []int64
	rows, err := pool.Query(ctx, `SELECT version_id FROM goose_db_version WHERE version_id > 0 ORDER BY version_id`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var version int64
		if err := rows.Scan(&version); err != nil {
			t.Fatal(err)
		}
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}

	if len(versions) != len(names) {
		t.Fatalf("goose has %d migrations recorded, want %d", len(versions), len(names))
	}

	if dumpSchema(t, name) != dumpSchema(t, "coaster") {
		t.Error("the schema after taking over differs from the one of an empty database")
	}
}

func TestMigrateRefusesAPrismaHistoryItCannotTakeOver(t *testing.T) {
	tests := []struct {
		name       string
		migration  string
		finishedAt string
	}{
		{name: "a migration Prisma left half applied", migration: migrationNames(t)[0], finishedAt: "NULL"},
		{name: "a migration goose does not have", migration: "29991231000000_unknown", finishedAt: "now()"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, databaseURL, pool := newDatabase(t)

			mustExec(t, pool, prismaMigrationsTable)
			mustExec(t, pool, `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at) VALUES ('1', '', $1, `+tt.finishedAt+`)`, tt.migration)

			err := Migrate(context.Background(), databaseURL)
			if err == nil || !strings.Contains(err.Error(), tt.migration) {
				t.Fatalf("Migrate() = %v, want an error naming %s", err, tt.migration)
			}

			var gooseHistory bool
			if err := pool.QueryRow(context.Background(), `SELECT to_regclass('goose_db_version') IS NOT NULL`).Scan(&gooseHistory); err != nil {
				t.Fatal(err)
			}
			if gooseHistory {
				t.Error("goose recorded a history it refused to take over")
			}
		})
	}
}

func newDatabase(t *testing.T) (string, string, *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	name := "db_" + strings.ToLower(strings.NewReplacer("/", "_", " ", "_").Replace(t.Name()))

	mustExec(t, testPool, `CREATE DATABASE `+name)
	t.Cleanup(func() {
		if _, err := testPool.Exec(context.Background(), `DROP DATABASE `+name+` WITH (FORCE)`); err != nil {
			t.Errorf("dropping %s: %v", name, err)
		}
	})

	databaseURL, err := url.Parse(testDatabaseURL)
	if err != nil {
		t.Fatal(err)
	}
	databaseURL.Path = "/" + name

	pool, err := pgxpool.New(ctx, databaseURL.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	return name, databaseURL.String(), pool
}

func migrationNames(t *testing.T) []string {
	t.Helper()

	files, err := fs.Glob(migrationFiles, "migrations/*.sql")
	if err != nil {
		t.Fatal(err)
	}

	names := make([]string, 0, len(files))
	for _, file := range files {
		names = append(names, strings.TrimSuffix(path.Base(file), ".sql"))
	}
	slices.Sort(names)

	return names
}

func mustExec(t *testing.T, pool *pgxpool.Pool, sql string, args ...any) {
	t.Helper()

	if _, err := pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(err)
	}
}
