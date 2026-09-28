package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
)

const maxBodyBytes = 1 << 20

const (
	messageBodyTooLarge  = "Request body is too large"
	messageEmptyJSONBody = "Body cannot be empty when content-type is set to 'application/json'"
	messageInvalidJSON   = "Body is not valid JSON but content-type is set to 'application/json'"
)

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

func writeRouteNotFound(w http.ResponseWriter, r *http.Request) {
	middleware.WriteNestError(w, http.StatusNotFound, "Cannot "+r.Method+" "+r.URL.RequestURI())
}

func decodeJSON(r *http.Request, dst any) error {
	body, raw, err := readJSON(r)
	if err != nil {
		return err
	}

	return validateBody(body, raw, dst)
}

func readJSON(r *http.Request) ([]byte, any, error) {
	body, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return nil, nil, &requestError{status: http.StatusRequestEntityTooLarge, message: messageBodyTooLarge}
		}
		return nil, nil, err
	}

	contentType := r.Header.Get("Content-Type")
	mediaType, _, _ := mime.ParseMediaType(contentType)
	isJSON := mediaType == "application/json"

	if len(bytes.TrimSpace(body)) == 0 {
		if isJSON {
			return nil, nil, &requestError{status: http.StatusBadRequest, message: messageEmptyJSONBody}
		}
		body = []byte("{}")
	} else if !isJSON {
		return nil, nil, &requestError{status: http.StatusUnsupportedMediaType, message: "Unsupported Media Type: " + contentType}
	}

	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()

	var raw any
	if err := decoder.Decode(&raw); err != nil {
		return nil, nil, &requestError{status: http.StatusBadRequest, message: messageInvalidJSON}
	}
	if decoder.More() {
		return nil, nil, &requestError{status: http.StatusBadRequest, message: messageInvalidJSON}
	}

	return body, raw, nil
}
