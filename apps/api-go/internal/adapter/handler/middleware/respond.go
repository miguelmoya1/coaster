package middleware

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"api-go/internal/core/domain"
)

// The error bodies Nest sends. The field order is the same as Nest's.

// nestError is what Nest's built-in exceptions send (NotFoundException and the like).
type nestError struct {
	Message any    `json:"message"`
	Error   string `json:"error"`
	Status  int    `json:"statusCode"`
}

// plainError is what Nest sends for an HttpException built from a string, for the
// generic 500 and for the errors Fastify raises itself (broken JSON, body too large).
type plainError struct {
	Status  int    `json:"statusCode"`
	Message string `json:"message"`
}

// paymentRequiredError is the body of the subscription guard's 402.
type paymentRequiredError struct {
	Status    int    `json:"statusCode"`
	Error     string `json:"error"`
	Message   string `json:"message"`
	ErrorCode string `json:"errorCode"`
}

// WriteJSON writes v as JSON, like Nest does: no HTML escaping and no trailing newline.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	body, err := marshal(v)
	if err != nil {
		slog.Error("encoding a response", "error", err)
		status = http.StatusInternalServerError
		body, _ = marshal(plainError{Status: status, Message: "Internal server error"})
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	w.Write(body)
}

func marshal(v any) ([]byte, error) {
	var buf bytes.Buffer

	// JSON.stringify does not escape <, > and &, so neither do we.
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(v); err != nil {
		return nil, err
	}

	// Encode adds a newline that JSON.stringify does not.
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}

// WriteError turns err into Nest's error body. A domain.Error keeps its code;
// anything else is logged and answered with Nest's generic 500.
func WriteError(w http.ResponseWriter, err error) {
	var domainErr *domain.Error
	if !errors.As(err, &domainErr) {
		slog.Error("unhandled error", "error", err)
		WriteInternalServerError(w)
		return
	}

	switch domainErr.Kind {
	case domain.KindTooManyRequests:
		WriteJSON(w, http.StatusTooManyRequests, plainError{Status: http.StatusTooManyRequests, Message: domainErr.Code})
	case domain.KindPaymentRequired:
		WriteJSON(w, http.StatusPaymentRequired, paymentRequiredError{
			Status:    http.StatusPaymentRequired,
			Error:     http.StatusText(http.StatusPaymentRequired),
			Message:   domainErr.Code,
			ErrorCode: domainErr.Code,
		})
	default:
		WriteNestError(w, statusOf(domainErr.Kind), domainErr.Code)
	}
}

// WriteNestError writes the body of Nest's built-in exceptions. message is a string,
// or a []string for validation errors.
func WriteNestError(w http.ResponseWriter, status int, message any) {
	WriteJSON(w, status, nestError{Message: message, Error: http.StatusText(status), Status: status})
}

// WritePlainError writes {"statusCode", "message"}, without "error".
func WritePlainError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, plainError{Status: status, Message: message})
}

// WriteInternalServerError writes Nest's generic 500.
func WriteInternalServerError(w http.ResponseWriter) {
	WritePlainError(w, http.StatusInternalServerError, "Internal server error")
}

func statusOf(kind domain.ErrorKind) int {
	switch kind {
	case domain.KindBadRequest:
		return http.StatusBadRequest
	case domain.KindUnauthorized:
		return http.StatusUnauthorized
	case domain.KindPaymentRequired:
		return http.StatusPaymentRequired
	case domain.KindForbidden:
		return http.StatusForbidden
	case domain.KindNotFound:
		return http.StatusNotFound
	case domain.KindConflict:
		return http.StatusConflict
	case domain.KindTooManyRequests:
		return http.StatusTooManyRequests
	case domain.KindServiceUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}
