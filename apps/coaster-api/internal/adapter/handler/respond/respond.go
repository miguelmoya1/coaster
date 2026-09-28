package respond

import (
	"errors"
	"log/slog"
	"net/http"

	"coaster-api/internal/adapter/nodejson"
	"coaster-api/internal/core/domain"
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

func JSON(w http.ResponseWriter, status int, v any) {
	body, err := nodejson.Marshal(v)
	if err != nil {
		slog.Error("encoding a response", "error", err)
		status = http.StatusInternalServerError
		body, _ = nodejson.Marshal(plainError{Status: status, Message: "Internal server error"})
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	w.Write(body)
}

func Error(w http.ResponseWriter, err error) {
	var domainErr *domain.Error
	if !errors.As(err, &domainErr) {
		slog.Error("unhandled error", "error", err)
		InternalServerError(w)
		return
	}

	switch domainErr.Kind {
	case domain.KindTooManyRequests:
		JSON(w, http.StatusTooManyRequests, plainError{Status: http.StatusTooManyRequests, Message: domainErr.Code})
	case domain.KindPaymentRequired:
		JSON(w, http.StatusPaymentRequired, paymentRequiredError{
			Status:    http.StatusPaymentRequired,
			Error:     http.StatusText(http.StatusPaymentRequired),
			Message:   domainErr.Code,
			ErrorCode: domainErr.Code,
		})
	default:
		NestError(w, statusOf(domainErr.Kind), domainErr.Code)
	}
}

func NestError(w http.ResponseWriter, status int, message any) {
	JSON(w, status, nestError{Message: message, Error: http.StatusText(status), Status: status})
}

func PlainError(w http.ResponseWriter, status int, message string) {
	JSON(w, status, plainError{Status: status, Message: message})
}

func InternalServerError(w http.ResponseWriter) {
	PlainError(w, http.StatusInternalServerError, "Internal server error")
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
