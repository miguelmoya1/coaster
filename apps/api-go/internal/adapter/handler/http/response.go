package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
)

// maxBodyBytes is Fastify's default body limit.
const maxBodyBytes = 1 << 20

// The messages Fastify sends when it cannot read a body. Nest passes them through as they are.
const (
	messageBodyTooLarge  = "Request body is too large"
	messageEmptyJSONBody = "Body cannot be empty when content-type is set to 'application/json'"
	messageInvalidJSON   = "Body is not valid JSON but content-type is set to 'application/json'"
)

// requestError is a request Nest rejects before it reaches the controller: a body it
// cannot read, or one that fails validation.
type requestError struct {
	status     int
	message    string
	validation []string
}

func (e *requestError) Error() string {
	if e.validation != nil {
		return "validation failed"
	}
	return e.message
}

func validationFailed(messages []string) *requestError {
	return &requestError{status: http.StatusBadRequest, validation: messages}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	middleware.WriteJSON(w, status, v)
}

// writeError answers with the same body Nest would send for err.
func writeError(w http.ResponseWriter, err error) {
	var reqErr *requestError
	if errors.As(err, &reqErr) {
		if reqErr.validation != nil {
			middleware.WriteNestError(w, reqErr.status, reqErr.validation)
		} else {
			middleware.WritePlainError(w, reqErr.status, reqErr.message)
		}
		return
	}

	middleware.WriteError(w, err)
}

// writeRouteNotFound is Nest's answer for a route that does not exist.
func writeRouteNotFound(w http.ResponseWriter, r *http.Request) {
	middleware.WriteNestError(w, http.StatusNotFound, "Cannot "+r.Method+" "+r.URL.RequestURI())
}

// decodeJSON reads the body into dst, a pointer to a struct, and validates it like
// Nest's ValidationPipe: unknown properties are rejected and the rules come from the
// "validate" tags. The error it returns is ready for writeError.
func decodeJSON(r *http.Request, dst any) error {
	body, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return &requestError{status: http.StatusRequestEntityTooLarge, message: messageBodyTooLarge}
		}
		return err
	}

	contentType := r.Header.Get("Content-Type")
	mediaType, _, _ := mime.ParseMediaType(contentType)
	isJSON := mediaType == "application/json"

	if len(bytes.TrimSpace(body)) == 0 {
		if isJSON {
			return &requestError{status: http.StatusBadRequest, message: messageEmptyJSONBody}
		}
		body = []byte("{}")
	} else if !isJSON {
		return &requestError{status: http.StatusUnsupportedMediaType, message: "Unsupported Media Type: " + contentType}
	}

	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()

	var raw any
	if err := decoder.Decode(&raw); err != nil {
		return &requestError{status: http.StatusBadRequest, message: messageInvalidJSON}
	}
	if decoder.More() {
		return &requestError{status: http.StatusBadRequest, message: messageInvalidJSON}
	}

	return validateBody(body, raw, dst)
}
