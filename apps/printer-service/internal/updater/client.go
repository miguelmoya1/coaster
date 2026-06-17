package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"github.com/minio/selfupdate"
)

const CurrentVersion = "1.0.0"

type VersionResponse struct {
	Version string `json:"version"`
	URL     string `json:"url"` // Ruta del binario correspondiente al OS
}

type Updater struct {
	BackendURL string // URL de tu API, ej: "https://mi-backend.com/api/printer/version"
}

func NewUpdater(url string) *Updater {
	return &Updater{BackendURL: url}
}

func (u *Updater) AutoUpdate() error {
	client := &http.Client{Timeout: 10 * time.Second}

	osName := runtime.GOOS
	checkURL := fmt.Sprintf("%s?os=%s", u.BackendURL, osName)

	// 1. Consultar al backend si hay nueva versión
	resp, err := client.Get(checkURL)
	if err != nil {
		return fmt.Errorf("error al consultar actualización: %w", err)
	}
	defer resp.Body.Close()

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
		return fmt.Errorf("error al descargar nuevo binario: %w", err)
	}
	defer binaryResp.Body.Close()

	// 3. Aplicar la actualización de forma segura (intercambio de archivos en caliente)
	err = selfupdate.Apply(binaryResp.Body, selfupdate.Options{})
	if err != nil {
		return fmt.Errorf("error al aplicar parche de actualización: %w", err)
	}

	// 4. Reiniciar el proceso para ejecutar la nueva versión
	go u.restartApplication()

	os.Exit(0)
	return nil
}

func (u *Updater) restartApplication() {
	self, _ := os.Executable()
	cmd := exec.Command(self, os.Args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Start()
}
