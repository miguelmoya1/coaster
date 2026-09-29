package storage

import (
	"context"
	"sync"
	"time"

	"cloud.google.com/go/storage"
)

const defaultBucket = "imagenes-clientes-app"

type GCS struct {
	bucket string

	mu     sync.Mutex
	client *storage.Client
}

func NewGCS(bucket string) *GCS {
	if bucket == "" {
		bucket = defaultBucket
	}
	return &GCS{bucket: bucket}
}

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
