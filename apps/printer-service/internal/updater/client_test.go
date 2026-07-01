package updater_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"printer-service/internal/updater"
)

func TestUpdater_AutoUpdate_Success(t *testing.T) {
	// Mock backend that returns a valid new version and a download URL
	mux := http.NewServeMux()
	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		resp := updater.VersionResponse{
			Version: "2.0.0",
			URL:     "http://" + r.Host + "/download",
		}
		json.NewEncoder(w).Encode(resp)
	})
	mux.HandleFunc("/download", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("mock_binary_data"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	u := updater.NewUpdater(server.URL + "/version")
	
	// Inject mocks
	applyCalled := false
	restartCalled := false
	exitCalled := false

	u.ApplyUpdateFunc = func(r io.Reader) error {
		applyCalled = true
		return nil
	}
	u.RestartFunc = func(execPath string) error {
		restartCalled = true
		return nil
	}
	u.ExitFunc = func(code int) {
		exitCalled = true
	}

	err := u.AutoUpdate()
	if err != nil {
		t.Errorf("expected no error on success, got: %v", err)
	}

	if !applyCalled {
		t.Errorf("expected ApplyUpdateFunc to be called")
	}
	if !restartCalled {
		t.Errorf("expected RestartFunc to be called")
	}
	if !exitCalled {
		t.Errorf("expected ExitFunc to be called")
	}
}

func TestUpdater_AutoUpdate_AlreadyUpToDate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := updater.VersionResponse{
			Version: updater.CurrentVersion,
			URL:     "http://example.com/binary",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	u := updater.NewUpdater(server.URL)

	err := u.AutoUpdate()
	if err != nil {
		t.Errorf("expected no error when up to date, got: %v", err)
	}
}

func TestUpdater_AutoUpdate_BackendError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	u := updater.NewUpdater(server.URL)

	err := u.AutoUpdate()
	if err == nil {
		t.Errorf("expected error on 500 response, got nil")
	} else if !strings.Contains(err.Error(), "status code 500") {
		t.Errorf("expected status code 500 error, got %v", err)
	}
}

func TestUpdater_AutoUpdate_DownloadFails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := updater.VersionResponse{
			Version: "99.99.99",
			URL:     "http://localhost:99999/invalid",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	u := updater.NewUpdater(server.URL)

	err := u.AutoUpdate()
	if err == nil {
		t.Errorf("expected error on download failure, got nil")
	} else if !strings.Contains(err.Error(), "failed to download new binary") {
		t.Errorf("expected download failure error, got %v", err)
	}
}
