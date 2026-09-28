package service

import (
	"context"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"time"
	"uuid"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

const (
	mediaUploadURLTTL  = 15 * time.Minute
	mediaMaxUploadSize = 5 * 1024 * 1024
)

var mediaExtensions = []string{".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}

type MediaService struct {
	storage ports.FileStorage
	now     func() time.Time
}

func NewMediaService(storage ports.FileStorage) *MediaService {
	return &MediaService{storage: storage, now: time.Now}
}

func (s *MediaService) UploadURLs(ctx context.Context, establishmentID, entityType string, files []domain.MediaFile) ([]domain.MediaUpload, error) {
	uploads := make([]domain.MediaUpload, 0, len(files))

	for _, file := range files {
		objectName := uuid.NewV4().String() + safeMediaExtension(file.Filename)
		objectPath := "establishments/" + establishmentID + "/" + entityType + "/" + objectName
		headers := map[string]string{"x-goog-content-length-range": "0," + strconv.Itoa(mediaMaxUploadSize)}

		signedURL, err := s.storage.SignUploadURL(ctx, objectPath, file.ContentType, headers, s.now().Add(mediaUploadURLTTL))
		if err != nil {
			slog.Error("error generating signed URL", "object", objectName, "error", err)
			return nil, err
		}

		uploads = append(uploads, domain.MediaUpload{
			UploadURL:     signedURL,
			PublicURL:     s.storage.PublicURL(objectPath),
			UploadHeaders: headers,
		})
	}

	return uploads, nil
}

func safeMediaExtension(filename string) string {
	base := filename[strings.LastIndex(filename, "/")+1:]

	dot := strings.LastIndex(base, ".")
	if dot <= 0 {
		return ""
	}

	extension := strings.ToLower(base[dot:])
	if !slices.Contains(mediaExtensions, extension) {
		return ""
	}
	return extension
}
