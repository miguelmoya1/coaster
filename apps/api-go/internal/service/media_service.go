package service

import (
	"context"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"time"
	"uuid"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// How long an upload URL lasts and how big the file may be, as media.service.ts.
const (
	mediaUploadURLTTL  = 15 * time.Minute
	mediaMaxUploadSize = 5 * 1024 * 1024
)

// mediaExtensions are the file extensions kept in the object name; any other is dropped.
var mediaExtensions = []string{".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}

// MediaService signs the URLs the web app uploads images to, straight to the bucket.
type MediaService struct {
	storage ports.FileStorage
	now     func() time.Time
}

func NewMediaService(storage ports.FileStorage) *MediaService {
	return &MediaService{storage: storage, now: time.Now}
}

// UploadURLs is MediaService.generateUploadUrls: one signed URL per file, under
// establishments/<id>/<entityType>/ with a random name.
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

// safeMediaExtension is the lower-case extension of filename, as Node's path.extname reads
// it, or "" when it is not an image extension.
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
