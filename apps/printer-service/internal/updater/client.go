package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"github.com/minio/selfupdate"
)

const updatedToEnv = "PRINTER_SERVICE_UPDATED_TO"

const (
	checkTimeout    = 15 * time.Second
	downloadTimeout = 10 * time.Minute
	idleTimeout     = 30 * time.Second
	maxBinaryBytes  = 128 << 20
)

type VersionResponse struct {
	Version string `json:"version"`
	URL     string `json:"url"`
	SHA256  string `json:"sha256"`
}

type Updater struct {
	BackendURL      string
	ApplyUpdateFunc func(r io.Reader, checksum []byte) error
	RestartFunc     func(execPath, version string) error
	ExitFunc        func(code int)

	AcquireIdle func(timeout time.Duration) bool

	checkClient    *http.Client
	downloadClient *http.Client
}

func NewUpdater(url string) *Updater {
	return &Updater{
		BackendURL:      url,
		ApplyUpdateFunc: applyUpdate,
		RestartFunc:     restart,
		ExitFunc:        os.Exit,
		checkClient:     &http.Client{Timeout: checkTimeout},
		downloadClient:  &http.Client{Timeout: downloadTimeout},
	}
}

func applyUpdate(r io.Reader, checksum []byte) error {
	return selfupdate.Apply(r, selfupdate.Options{Checksum: checksum})
}

func restart(execPath, version string) error {
	cmd := exec.Command(execPath, os.Args[1:]...)
	cmd.Env = append(os.Environ(), updatedToEnv+"="+version)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Start()
}

func PreviousAttemptFailed() (string, bool) {
	attempted := os.Getenv(updatedToEnv)
	return attempted, attempted != "" && attempted != CurrentVersion
}

func (u *Updater) AutoUpdate() error {
	if attempted, failed := PreviousAttemptFailed(); failed {
		return fmt.Errorf(
			"refusing to update: the previous run applied version %s but this binary reports %s; "+
				"the API is advertising a version it is not serving", attempted, CurrentVersion)
	}

	target, err := u.fetchTarget()
	if err != nil {
		return err
	}

	newer, err := compareVersions(target.Version, CurrentVersion)
	if err != nil {
		return fmt.Errorf("backend advertised an unusable version: %w", err)
	}
	if newer <= 0 {
		return nil
	}

	if target.URL == "" {
		return fmt.Errorf("backend advertised version %s without a download URL", target.Version)
	}

	checksum, err := hex.DecodeString(target.SHA256)
	if err != nil || len(checksum) != sha256.Size {
		return fmt.Errorf("backend advertised version %s without a usable sha256 checksum", target.Version)
	}

	log.Printf("Updating from %s to %s...\n", CurrentVersion, target.Version)

	body, err := u.download(target.URL)
	if err != nil {
		return err
	}
	defer body.Close()

	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("could not get executable path: %w", err)
	}

	if err := u.ApplyUpdateFunc(body, checksum); err != nil {
		return fmt.Errorf("failed to apply update: %w", err)
	}

	if u.AcquireIdle != nil && !u.AcquireIdle(idleTimeout) {
		return fmt.Errorf("update to %s is staged but the printer stayed busy; it will apply on the next restart", target.Version)
	}

	log.Printf("Update to %s applied, restarting...\n", target.Version)

	if err := u.RestartFunc(execPath, target.Version); err != nil {
		return fmt.Errorf("failed to restart application: %w", err)
	}

	u.ExitFunc(0)
	return nil
}

func (u *Updater) fetchTarget() (VersionResponse, error) {
	var target VersionResponse

	checkURL := fmt.Sprintf("%s?os=%s&arch=%s", u.BackendURL, runtime.GOOS, runtime.GOARCH)
	resp, err := u.checkClient.Get(checkURL)
	if err != nil {
		return target, fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return target, fmt.Errorf("failed to check for updates: status code %d", resp.StatusCode)
	}

	if err := json.NewDecoder(io.LimitReader(resp.Body, 64<<10)).Decode(&target); err != nil {
		return target, fmt.Errorf("failed to parse version response: %w", err)
	}

	return target, nil
}

func (u *Updater) download(url string) (io.ReadCloser, error) {
	resp, err := u.downloadClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to download new binary: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("failed to download new binary: status code %d from %s", resp.StatusCode, url)
	}

	return readCloser{
		Reader: io.LimitReader(resp.Body, maxBinaryBytes),
		Closer: resp.Body,
	}, nil
}

type readCloser struct {
	io.Reader
	io.Closer
}

func (u *Updater) Watch(ctx context.Context, interval time.Duration) {
	check := func() {
		if err := u.AutoUpdate(); err != nil {
			log.Printf("Update check failed, staying on %s: %v\n", CurrentVersion, err)
		}
	}

	check()

	if interval <= 0 {
		return
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			check()
		}
	}
}
