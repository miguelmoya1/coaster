package ports

import (
	"context"
	"time"
)

// FileStorage signs uploads to the bucket of the media (Google Cloud Storage).
type FileStorage interface {
	// SignUploadURL returns a URL that lets anyone PUT the object until expires, with that
	// content type and those extra headers.
	SignUploadURL(ctx context.Context, objectPath, contentType string, headers map[string]string, expires time.Time) (string, error)
	// PublicURL is where the object can be read once uploaded.
	PublicURL(objectPath string) string
}
