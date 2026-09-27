package domain

// MediaEntityTypes are the folders an upload can go to, as GenerateUploadUrlsDto.
var MediaEntityTypes = []string{"products", "templates", "users", "establishments", "categories"}

// MediaImageTypes are the content types an upload may have (ALLOWED_IMAGE_TYPES).
var MediaImageTypes = []string{"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"}

// MediaFile is one file the client wants to upload.
type MediaFile struct {
	Filename    string
	ContentType string
}

// MediaUpload is where the client uploads one file and where it can be read afterwards,
// MediaUploadResponse in @coaster/common.
type MediaUpload struct {
	UploadURL     string            `json:"uploadUrl"`
	PublicURL     string            `json:"publicUrl"`
	UploadHeaders map[string]string `json:"uploadHeaders"`
}
