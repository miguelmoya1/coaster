package respond

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	JSON(w, http.StatusOK, map[string]string{"greeting": "hello"})
	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Errorf("content-type = %q", ct)
	}
	if !strings.Contains(w.Body.String(), `"greeting":"hello"`) {
		t.Errorf("body = %s", w.Body.String())
	}

	// Marshaling failure
	w2 := httptest.NewRecorder()
	JSON(w2, http.StatusOK, make(chan int))
	if w2.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w2.Code, http.StatusInternalServerError)
	}
	if !strings.Contains(w2.Body.String(), "Internal server error") {
		t.Errorf("body = %s", w2.Body.String())
	}
}

func TestError(t *testing.T) {
	// Unhandled error -> 500
	w := httptest.NewRecorder()
	Error(w, errors.New("unexpected error"))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}

	// TooManyRequests
	w = httptest.NewRecorder()
	Error(w, domain.TooManyRequests("RATE_LIMITED"))
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("status = %d, want 429", w.Code)
	}
	if !strings.Contains(w.Body.String(), "RATE_LIMITED") {
		t.Errorf("body = %s", w.Body.String())
	}

	// PaymentRequired
	w = httptest.NewRecorder()
	Error(w, domain.PaymentRequired("PLAN_REQUIRED"))
	if w.Code != http.StatusPaymentRequired {
		t.Errorf("status = %d, want 402", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"errorCode":"PLAN_REQUIRED"`) {
		t.Errorf("body = %s", w.Body.String())
	}

	// Other kinds
	tests := []struct {
		kind domain.ErrorKind
		code int
	}{
		{domain.KindBadRequest, http.StatusBadRequest},
		{domain.KindUnauthorized, http.StatusUnauthorized},
		{domain.KindForbidden, http.StatusForbidden},
		{domain.KindNotFound, http.StatusNotFound},
		{domain.KindConflict, http.StatusConflict},
		{domain.KindServiceUnavailable, http.StatusServiceUnavailable},
		{domain.ErrorKind(999), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		w = httptest.NewRecorder()
		Error(w, &domain.Error{Kind: tt.kind, Code: "TEST_ERR"})
		if w.Code != tt.code {
			t.Errorf("kind %v = status %d, want %d", tt.kind, w.Code, tt.code)
		}
	}
}

func TestPlainErrorAndInternalServerError(t *testing.T) {
	w := httptest.NewRecorder()
	InternalServerError(w)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"statusCode":500`) {
		t.Errorf("body = %s", w.Body.String())
	}

	w2 := httptest.NewRecorder()
	PlainError(w2, http.StatusBadRequest, "bad payload")
	if w2.Code != http.StatusBadRequest || !strings.Contains(w2.Body.String(), "bad payload") {
		t.Errorf("PlainError = %s", w2.Body.String())
	}

	w3 := httptest.NewRecorder()
	NestError(w3, http.StatusPaymentRequired, "plan needed")
	if w3.Code != http.StatusPaymentRequired || !strings.Contains(w3.Body.String(), "plan needed") {
		t.Errorf("NestError = %s", w3.Body.String())
	}

	if s := statusOf(domain.KindPaymentRequired); s != http.StatusPaymentRequired {
		t.Errorf("statusOf(KindPaymentRequired) = %d", s)
	}
}
