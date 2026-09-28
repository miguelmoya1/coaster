package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type FileStorage interface {
	SignUploadURL(ctx context.Context, objectPath, contentType string, headers map[string]string, expires time.Time) (string, error)

	PublicURL(objectPath string) string
}

type MediaService interface {
	UploadURLs(ctx context.Context, establishmentID, entityType string, files []domain.MediaFile) ([]domain.MediaUpload, error)
}
