package e2e

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"coaster-api/internal/testdb"
)

const (
	migrationsDir  = "../../database/migrations"
	authSecret     = "e2e-auth-secret-that-only-these-tests-use"
	printerSecret  = "e2e-printer-secret-that-only-these-tests-use"
	googleClientID = "e2e-client.apps.googleusercontent.com"
	googleKeyID    = "e2e-key"
)

var (
	testDB     *testdb.Database
	apiBinary  string
	googleKey  *rsa.PrivateKey
	googleCert *httptest.Server
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

	binaries, err := os.MkdirTemp("", "coaster-api-e2e-")
	if err != nil {
		log.Print(err)
		return 1
	}
	defer os.RemoveAll(binaries)

	apiBinary = filepath.Join(binaries, "api")
	if err := buildAPI(apiBinary); err != nil {
		log.Print(err)
		return 1
	}

	googleKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		log.Print(err)
		return 1
	}
	googleCert = httptest.NewServer(http.HandlerFunc(serveGoogleKeys))
	defer googleCert.Close()

	return m.Run()
}

func buildAPI(output string) error {
	build := exec.Command("go", "build", "-o", output, "./cmd/api")
	build.Dir = ".."
	build.Stdout = os.Stdout
	build.Stderr = os.Stderr
	if err := build.Run(); err != nil {
		return fmt.Errorf("building the API: %w", err)
	}
	return nil
}

func serveGoogleKeys(w http.ResponseWriter, _ *http.Request) {
	key := map[string]string{
		"kty": "RSA",
		"alg": "RS256",
		"use": "sig",
		"kid": googleKeyID,
		"n":   base64.RawURLEncoding.EncodeToString(googleKey.N.Bytes()),
		"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(googleKey.E)).Bytes()),
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{key}})
}
