package storage

import (
	"context"
	"sync"
	"time"

	"cloud.google.com/go/storage"
)

// defaultBucket is the bucket Nest uses when MEDIA_BUCKET is not set.
const defaultBucket = "imagenes-clientes-app"

// GCS signs uploads to a Google Cloud Storage bucket. Like Nest's Storage, it looks for its
// credentials (GOOGLE_APPLICATION_CREDENTIALS, or the service account of Cloud Run) the
// first time it signs, so the API starts without them and only the upload URLs fail.
type GCS struct {
	bucket string

	mu     sync.Mutex
	client *storage.Client
}

// NewGCS signs for bucket, or for Nest's default bucket when it is "".
func NewGCS(bucket string) *GCS {
	if bucket == "" {
		bucket = defaultBucket
	}
	return &GCS{bucket: bucket}
}

// Close closes the client, if it was opened.
func (g *GCS) Close() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.client == nil {
		return nil
	}
	return g.client.Close()
}

func (g *GCS) SignUploadURL(ctx context.Context, objectPath, contentType string, headers map[string]string, expires time.Time) (string, error) {
	client, err := g.openClient(ctx)
	if err != nil {
		return "", err
	}

	var extensionHeaders []string
	for name, value := range headers {
		extensionHeaders = append(extensionHeaders, name+":"+value)
	}

	return client.Bucket(g.bucket).SignedURL(objectPath, &storage.SignedURLOptions{
		Scheme:      storage.SigningSchemeV4,
		Method:      "PUT",
		Expires:     expires,
		ContentType: contentType,
		Headers:     extensionHeaders,
	})
}

func (g *GCS) PublicURL(objectPath string) string {
	return "https://storage.googleapis.com/" + g.bucket + "/" + objectPath
}

// openClient opens the client the first time it is needed. If that fails, the next call
// tries again.
func (g *GCS) openClient(ctx context.Context) (*storage.Client, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.client != nil {
		return g.client, nil
	}

	client, err := storage.NewClient(context.WithoutCancel(ctx))
	if err != nil {
		return nil, err
	}

	g.client = client
	return client, nil
}
