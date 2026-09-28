package storage

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func writeServiceAccount(t *testing.T) string {
	t.Helper()

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}

	account, err := json.Marshal(map[string]string{
		"type":           "service_account",
		"project_id":     "coaster-test",
		"private_key_id": "key-1",
		"private_key":    string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})),
		"client_email":   "media@coaster-test.iam.gserviceaccount.com",
		"client_id":      "1",
		"token_uri":      "https://oauth2.googleapis.com/token",
	})
	if err != nil {
		t.Fatal(err)
	}

	path := filepath.Join(t.TempDir(), "service-account.json")
	if err := os.WriteFile(path, account, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestGCSSignsAnUpload(t *testing.T) {
	t.Setenv("GOOGLE_APPLICATION_CREDENTIALS", writeServiceAccount(t))

	gcs := NewGCS("")
	defer gcs.Close()

	objectPath := "establishments/e1/products/photo.png"
	signed, err := gcs.SignUploadURL(context.Background(), objectPath, "image/png",
		map[string]string{"x-goog-content-length-range": "0,5242880"}, time.Now().Add(15*time.Minute))
	if err != nil {
		t.Fatal(err)
	}

	parsed, err := url.Parse(signed)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Host != "storage.googleapis.com" || parsed.Path != "/imagenes-clientes-app/"+objectPath {
		t.Errorf("signed URL = %s", signed)
	}

	query := parsed.Query()
	expires := query.Get("X-Goog-Expires")
	if query.Get("X-Goog-Algorithm") != "GOOG4-RSA-SHA256" || (expires != "899" && expires != "900") {
		t.Errorf("not a 15 minute V4 signature: %s", signed)
	}
	if headers := query.Get("X-Goog-SignedHeaders"); !strings.Contains(headers, "content-type") || !strings.Contains(headers, "x-goog-content-length-range") {
		t.Errorf("signed headers = %q", headers)
	}

	if got := gcs.PublicURL(objectPath); got != "https://storage.googleapis.com/imagenes-clientes-app/"+objectPath {
		t.Errorf("public URL = %s", got)
	}
}

func TestGCSUsesTheConfiguredBucket(t *testing.T) {
	if got := NewGCS("my-bucket").PublicURL("a.png"); got != "https://storage.googleapis.com/my-bucket/a.png" {
		t.Errorf("public URL = %s", got)
	}
}
