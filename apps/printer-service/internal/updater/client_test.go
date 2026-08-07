package updater_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"printer-service/internal/updater"
)

const newBinary = "mock_binary_data"

type spy struct {
	applied  []byte
	checksum []byte
	restarts int
	exits    int
	applyErr error
}

func (s *spy) attach(u *updater.Updater) {
	u.ApplyUpdateFunc = func(r io.Reader, checksum []byte) error {
		body, err := io.ReadAll(r)
		if err != nil {
			return err
		}
		if s.applyErr != nil {
			return s.applyErr
		}
		sum := sha256.Sum256(body)
		if !bytes.Equal(sum[:], checksum) {
			return io.ErrUnexpectedEOF
		}
		s.applied = body
		s.checksum = checksum
		return nil
	}
	u.RestartFunc = func(execPath, version string) error {
		s.restarts++
		return nil
	}
	u.ExitFunc = func(code int) { s.exits++ }
}

type backendOptions struct {
	version     string
	sha256      string
	omitURL     bool
	downloadFn  http.HandlerFunc
	versionCode int
}

func newBackend(t *testing.T, opts backendOptions) *httptest.Server {
	t.Helper()

	mux := http.NewServeMux()
	var server *httptest.Server

	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		if opts.versionCode != 0 {
			w.WriteHeader(opts.versionCode)
			return
		}
		resp := updater.VersionResponse{Version: opts.version, SHA256: opts.sha256}
		if !opts.omitURL {
			resp.URL = server.URL + "/download"
		}
		json.NewEncoder(w).Encode(resp)
	})

	download := opts.downloadFn
	if download == nil {
		download = func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(newBinary))
		}
	}
	mux.HandleFunc("/download", download)

	server = httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func checksumOf(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func TestAutoUpdate_AppliesANewerVersion(t *testing.T) {
	server := newBackend(t, backendOptions{version: "99.0.0", sha256: checksumOf(newBinary)})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	if err := u.AutoUpdate(); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if string(s.applied) != newBinary {
		t.Errorf("expected the downloaded binary to be applied, got %q", s.applied)
	}
	if s.restarts != 1 {
		t.Errorf("expected one restart, got %d", s.restarts)
	}
	if s.exits != 1 {
		t.Errorf("expected the process to exit once, got %d", s.exits)
	}
}

func TestAutoUpdate_SkipsWhenUpToDate(t *testing.T) {
	server := newBackend(t, backendOptions{version: updater.CurrentVersion, sha256: checksumOf(newBinary)})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	if err := u.AutoUpdate(); err != nil {
		t.Fatalf("expected no error when up to date, got %v", err)
	}
	if s.applied != nil || s.restarts != 0 {
		t.Error("expected nothing to be applied when already up to date")
	}
}

func TestAutoUpdate_RefusesToDowngrade(t *testing.T) {
	server := newBackend(t, backendOptions{version: "0.0.1", sha256: checksumOf(newBinary)})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	if err := u.AutoUpdate(); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if s.applied != nil || s.restarts != 0 {
		t.Error("expected an older advertised version to be ignored")
	}
}

func TestAutoUpdate_DoesNotApplyAnErrorPage(t *testing.T) {
	server := newBackend(t, backendOptions{
		version: "99.0.0",
		sha256:  checksumOf(newBinary),
		downloadFn: func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("<html>Not Found</html>"))
		},
	})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	err := u.AutoUpdate()
	if err == nil {
		t.Fatal("expected an error for a 404 download")
	}
	if !strings.Contains(err.Error(), "status code 404") {
		t.Errorf("expected the status code in the error, got %v", err)
	}
	if s.applied != nil || s.restarts != 0 {
		t.Error("expected nothing to be written over the running binary")
	}
}

func TestAutoUpdate_RejectsACorruptedDownload(t *testing.T) {
	server := newBackend(t, backendOptions{
		version: "99.0.0",
		sha256:  checksumOf(newBinary),
		downloadFn: func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("truncated"))
		},
	})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	if err := u.AutoUpdate(); err == nil {
		t.Fatal("expected an error when the checksum does not match")
	}
	if s.restarts != 0 {
		t.Error("expected no restart after a failed apply")
	}
}

func TestAutoUpdate_RequiresAChecksum(t *testing.T) {
	server := newBackend(t, backendOptions{version: "99.0.0"})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	err := u.AutoUpdate()
	if err == nil || !strings.Contains(err.Error(), "sha256") {
		t.Fatalf("expected a checksum error, got %v", err)
	}
	if s.applied != nil {
		t.Error("expected nothing to be applied without a checksum")
	}
}

func TestAutoUpdate_RequiresADownloadURL(t *testing.T) {
	server := newBackend(t, backendOptions{version: "99.0.0", sha256: checksumOf(newBinary), omitURL: true})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	if err := u.AutoUpdate(); err == nil {
		t.Fatal("expected an error when no download URL is advertised")
	}
}

func TestAutoUpdate_ReportsBackendErrors(t *testing.T) {
	server := newBackend(t, backendOptions{versionCode: http.StatusInternalServerError})
	u := updater.NewUpdater(server.URL + "/version")

	err := u.AutoUpdate()
	if err == nil || !strings.Contains(err.Error(), "status code 500") {
		t.Fatalf("expected a status code 500 error, got %v", err)
	}
}

func TestAutoUpdate_StopsAfterAnUpdateThatDidNotStick(t *testing.T) {
	t.Setenv("PRINTER_SERVICE_UPDATED_TO", "99.0.0")

	server := newBackend(t, backendOptions{version: "99.0.0", sha256: checksumOf(newBinary)})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)

	err := u.AutoUpdate()
	if err == nil || !strings.Contains(err.Error(), "refusing to update") {
		t.Fatalf("expected the updater to refuse, got %v", err)
	}
	if s.applied != nil || s.restarts != 0 {
		t.Error("expected no second attempt at the same version")
	}
}

func TestAutoUpdate_WaitsForThePrinterToGoIdle(t *testing.T) {
	server := newBackend(t, backendOptions{version: "99.0.0", sha256: checksumOf(newBinary)})
	u := updater.NewUpdater(server.URL + "/version")

	s := &spy{}
	s.attach(u)
	u.AcquireIdle = func(timeout time.Duration) bool { return false }

	if err := u.AutoUpdate(); err == nil {
		t.Fatal("expected an error when the printer never goes idle")
	}
	if s.restarts != 0 {
		t.Error("expected no restart while a ticket is printing")
	}
}
