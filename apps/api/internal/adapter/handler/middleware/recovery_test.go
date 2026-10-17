package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRecover(t *testing.T) {
	// Normal request without panic
	okHandler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	w := httptest.NewRecorder()
	okHandler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	// Panic request
	panicHandler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went terribly wrong")
	}))

	req = httptest.NewRequest(http.MethodGet, "/panic", nil)
	w = httptest.NewRecorder()
	panicHandler.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("panic status = %d, want 500", w.Code)
	}

	// Panic with http.ErrAbortHandler must be re-panicked
	abortHandler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		r := recover()
		if r != http.ErrAbortHandler {
			t.Errorf("expected http.ErrAbortHandler to be re-panicked, got %v", r)
		}
	}()

	req = httptest.NewRequest(http.MethodGet, "/abort", nil)
	w = httptest.NewRecorder()
	abortHandler.ServeHTTP(w, req)
}
