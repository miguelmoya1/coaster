package domain

var MediaEntityTypes = []string{"products", "templates", "users", "establishments", "categories"}

var MediaImageTypes = []string{"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"}

type MediaFile struct {
	Filename    string
	ContentType string
}

type MediaUpload struct {
	UploadURL     string            `json:"uploadUrl"`
	PublicURL     string            `json:"publicUrl"`
	UploadHeaders map[string]string `json:"uploadHeaders"`
}
