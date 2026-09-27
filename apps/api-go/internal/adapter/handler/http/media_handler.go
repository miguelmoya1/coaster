package http

import (
	"net/http"
	"strings"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// MediaHandler is media.controller.ts.
type MediaHandler struct {
	media *service.MediaService
}

func NewMediaHandler(media *service.MediaService) *MediaHandler {
	return &MediaHandler{media: media}
}

func (h *MediaHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "POST /establishments/{establishmentId}/media/upload-urls", h.uploadURLs,
		middleware.Permissions(domain.PermissionUpdateProduct))
}

// uploadURLsRequest is GenerateUploadUrlsDto; a test checks its oneof lists against
// domain.MediaEntityTypes and domain.MediaImageTypes.
type uploadURLsRequest struct {
	EntityType string             `json:"entityType" validate:"required,oneof=products templates users establishments categories" msg:"required=REQUIRED,oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Files      []mediaFileRequest `json:"files" validate:"min=1,max=10,dive" msg:"min=REQUIRED,max=MAX_LENGTH,type=INVALID_TYPE"`
}

// mediaFileRequest is MediaFileRequestDto. The content type is compared trimmed and in
// lower case, like its @Transform.
type mediaFileRequest struct {
	Filename    string `json:"filename" validate:"required,max=255" msg:"required=REQUIRED,max=MAX_LENGTH,type=INVALID_TYPE"`
	ContentType string `json:"contentType" validate:"oneofci=image/jpeg image/png image/webp image/avif image/gif" msg:"oneofci=INVALID_TYPE,type=INVALID_TYPE"`
}

func (h *MediaHandler) uploadURLs(w http.ResponseWriter, r *http.Request) {
	var input uploadURLsRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	files := make([]domain.MediaFile, 0, len(input.Files))
	for _, file := range input.Files {
		files = append(files, domain.MediaFile{
			Filename:    file.Filename,
			ContentType: strings.ToLower(strings.TrimSpace(file.ContentType)),
		})
	}

	uploads, err := h.media.UploadURLs(r.Context(), r.PathValue("establishmentId"), input.EntityType, files)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, uploads)
}
