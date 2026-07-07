package updater

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"github.com/minio/selfupdate"
)

const CurrentVersion = "1.0.3"

type VersionResponse struct {
	Version string `json:"version"`
	URL     string `json:"url"` // Ruta del binario correspondiente al OS
}

type Updater struct {
	BackendURL      string // URL de tu API, ej: "https://mi-backend.com/api/printer/version"
	ApplyUpdateFunc func(r io.Reader) error
	RestartFunc     func(execPath string) error
	ExitFunc        func(code int)
}

var defaultApplyUpdate = func(r io.Reader) error {
	return selfupdate.Apply(r, selfupdate.Options{})
}

var defaultRestart = func(execPath string) error {
	cmd := exec.Command(execPath, os.Args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Start()
}

func NewUpdater(url string) *Updater {
	return &Updater{
		BackendURL:      url,
		ApplyUpdateFunc: defaultApplyUpdate,
		RestartFunc:     defaultRestart,
		ExitFunc:        os.Exit,
	}
}

func (u *Updater) AutoUpdate() error {
	client := &http.Client{Timeout: 10 * time.Second}

	osName := runtime.GOOS
	checkURL := fmt.Sprintf("%s?os=%s", u.BackendURL, osName)

	// 1. Consultar al backend si hay nueva versión
	resp, err := client.Get(checkURL)
	if err != nil {
		return fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to check for updates: status code %d", resp.StatusCode)
	}

	var target VersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&target); err != nil {
		return err
	}

	// Si estamos en la última versión, no hacemos nada
	if target.Version == CurrentVersion {
		return nil
	}

	// 2. Descargar el nuevo binario (el backend debe proveer el .exe o binario correcto según el OS)
	binaryResp, err := client.Get(target.URL)
	if err != nil {
		return fmt.Errorf("failed to download new binary: %w", err)
	}
	defer binaryResp.Body.Close()

	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("could not get executable path: %w", err)
	}

	// 3. Aplicar la actualización de forma segura (intercambio de archivos en caliente)
	err = u.ApplyUpdateFunc(binaryResp.Body)
	if err != nil {
		return fmt.Errorf("failed to apply update patch: %w", err)
	}

	// 4. Reiniciar el proceso para ejecutar la nueva versión
	if err := u.RestartFunc(execPath); err != nil {
		return fmt.Errorf("failed to restart application: %w", err)
	}

	u.ExitFunc(0)
	return nil
}
