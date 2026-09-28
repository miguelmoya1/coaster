package ports

import (
	"context"
	"time"
)

type FileStorage interface {
	SignUploadURL(ctx context.Context, objectPath, contentType string, headers map[string]string, expires time.Time) (string, error)

	PublicURL(objectPath string) string
}
