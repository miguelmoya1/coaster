package middleware

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"api-go/internal/core/domain"
)

type nestError struct {
	Message any    `json:"message"`
	Error   string `json:"error"`
	Status  int    `json:"statusCode"`
}

type plainError struct {
	Status  int    `json:"statusCode"`
	Message string `json:"message"`
}

type paymentRequiredError struct {
	Status    int    `json:"statusCode"`
	Error     string `json:"error"`
	Message   string `json:"message"`
	ErrorCode string `json:"errorCode"`
}

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

	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(v); err != nil {
		return nil, err
	}

	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}

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

func WriteNestError(w http.ResponseWriter, status int, message any) {
	WriteJSON(w, status, nestError{Message: message, Error: http.StatusText(status), Status: status})
}

func WritePlainError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, plainError{Status: status, Message: message})
}

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
