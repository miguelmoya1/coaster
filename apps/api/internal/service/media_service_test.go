package service

import (
	"context"
	"errors"
	"reflect"
	"regexp"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestMediaServiceUploadURLs(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		wantPath *regexp.Regexp
	}{
		{name: "inside the establishment's folder", filename: "beer.png", wantPath: regexp.MustCompile(`^establishments/est-1/products/[0-9a-f-]{36}\.png$`)},
		{name: "a filename cannot walk out of it", filename: "../../../other-establishment/evil.png", wantPath: regexp.MustCompile(`^establishments/est-1/products/[0-9a-f-]{36}\.png$`)},
		{name: "an unknown extension is dropped", filename: "payload.html", wantPath: regexp.MustCompile(`^establishments/est-1/products/[0-9a-f-]{36}$`)},
		{name: "the extension in lower case", filename: "Photo.JPEG", wantPath: regexp.MustCompile(`^establishments/est-1/products/[0-9a-f-]{36}\.jpeg$`)},
		{name: "a hidden file has no extension", filename: ".png", wantPath: regexp.MustCompile(`^establishments/est-1/products/[0-9a-f-]{36}$`)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			storage := &fakeFileStorage{}
			media := NewMediaService(storage)

			uploads, err := media.UploadURLs(context.Background(), "est-1", "products", []domain.MediaFile{{Filename: tt.filename, ContentType: "image/png"}})
			if err != nil {
				t.Fatal(err)
			}

			path := storage.paths[0]
			if !tt.wantPath.MatchString(path) || strings.Contains(path, "..") {
				t.Errorf("path = %q", path)
			}
			if uploads[0].PublicURL != "https://storage.googleapis.com/imagenes-clientes-app/"+path {
				t.Errorf("public URL = %q", uploads[0].PublicURL)
			}
		})
	}
}

func TestMediaServiceSignsTheContentTypeAndSize(t *testing.T) {
	storage := &fakeFileStorage{}
	media := NewMediaService(storage)
	media.now = func() time.Time { return time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC) }

	uploads, err := media.UploadURLs(context.Background(), "est-1", "products", []domain.MediaFile{{Filename: "beer.webp", ContentType: "image/webp"}})
	if err != nil {
		t.Fatal(err)
	}

	wantHeaders := map[string]string{"x-goog-content-length-range": "0,5242880"}
	if storage.contentType != "image/webp" || !reflect.DeepEqual(storage.headers, wantHeaders) {
		t.Errorf("signed %q with %v", storage.contentType, storage.headers)
	}
	if !storage.expires.Equal(time.Date(2026, 9, 27, 10, 15, 0, 0, time.UTC)) {
		t.Errorf("expires = %v, want 15 minutes later", storage.expires)
	}
	if uploads[0].UploadURL != "https://signed.example/upload" || !reflect.DeepEqual(uploads[0].UploadHeaders, wantHeaders) {
		t.Errorf("upload = %+v", uploads[0])
	}
}

func TestMediaServiceFailsWhenSigningFails(t *testing.T) {
	storage := &fakeFileStorage{err: errors.New("no credentials")}

	_, err := NewMediaService(storage).UploadURLs(context.Background(), "est-1", "products", []domain.MediaFile{{Filename: "a.png"}})
	if err == nil {
		t.Fatal("want the signing error")
	}
}
