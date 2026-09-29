package database

import (
	"context"
	"flag"
	"io"
	"os"
	"strings"
	"testing"

	tcexec "github.com/testcontainers/testcontainers-go/exec"
)

var update = flag.Bool("update", false, "rewrite schema.sql from the migrations")

func TestSchemaIsUpToDate(t *testing.T) {
	schema := dumpSchema(t, "coaster")

	if *update {
		if err := os.WriteFile("schema.sql", []byte(schema), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}

	written, err := os.ReadFile("schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	if string(written) != schema {
		t.Error("schema.sql does not match the migrations; rewrite it with: go test -run TestSchemaIsUpToDate -update")
	}
}

func dumpSchema(t *testing.T, databaseName string) string {
	t.Helper()

	code, output, err := testContainer.Exec(context.Background(), []string{
		"pg_dump", "--username=admin", "--dbname=" + databaseName,
		"--schema-only", "--no-owner", "--no-privileges",
		"--exclude-table=goose_db_version*", "--exclude-table=_prisma_migrations",
	}, tcexec.Multiplexed())
	if err != nil {
		t.Fatal(err)
	}

	dump, err := io.ReadAll(output)
	if err != nil {
		t.Fatal(err)
	}
	if code != 0 {
		t.Fatalf("pg_dump exited with %d: %s", code, dump)
	}

	var lines []string
	for line := range strings.Lines(string(dump)) {
		line = strings.TrimRight(line, "\n")
		if isDumpNoise(line) {
			continue
		}
		if line == "" && (len(lines) == 0 || lines[len(lines)-1] == "") {
			continue
		}
		lines = append(lines, line)
	}

	return strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
}

func isDumpNoise(line string) bool {
	for _, prefix := range []string{"--", "SET ", "SELECT pg_catalog.set_config", `\restrict`, `\unrestrict`} {
		if strings.HasPrefix(line, prefix) {
			return true
		}
	}
	return false
}
