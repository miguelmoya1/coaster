// Package pairing turns a freshly downloaded binary into one establishment's bridge.
//
// The customer downloads and double-clicks. There is no console, no flags and no .env, so the only
// thing the bridge knows about itself on first run is the name it was saved under.
package pairing

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const configFileName = "coaster-printer.json"

// Anything that is not a code character is noise: browsers rename a repeated download to
// "name (1).exe" and people move files about.
var codePattern = regexp.MustCompile(`(?i)coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})`)

// Config is what the bridge needs to stop being a generic binary.
type Config struct {
	EstablishmentID string `json:"establishmentId"`
	DeviceKey       string `json:"deviceKey"`
}

// CodeFromName recovers a pairing code from the file the customer opened.
func CodeFromName(name string) string {
	match := codePattern.FindStringSubmatch(filepath.Base(name))
	if match == nil {
		return ""
	}

	return strings.ToUpper(match[1])
}

// configPath keeps the pairing beside the binary, so moving the executable moves its identity too.
func configPath() (string, error) {
	executable, err := os.Executable()
	if err != nil {
		return "", err
	}

	return filepath.Join(filepath.Dir(executable), configFileName), nil
}

// Load returns what a previous run saved, or nil when this bridge has never been paired.
func Load() *Config {
	path, err := configPath()
	if err != nil {
		return nil
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil || cfg.EstablishmentID == "" || cfg.DeviceKey == "" {
		return nil
	}

	return &cfg
}

// Save writes the pairing so the next double-click needs no code at all.
func Save(cfg Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}

	raw, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, raw, 0o600)
}

// Redeem spends a code for the ids it stands for. A code is worth nothing afterwards, which is why
// it is safe to carry in something as public as a filename.
func Redeem(apiURL, code string) (*Config, error) {
	body, err := json.Marshal(map[string]string{"code": code})
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	response, err := client.Post(strings.TrimRight(apiURL, "/")+"/printer/pair", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("pairing refused with status %d", response.StatusCode)
	}

	var cfg Config
	if err := json.NewDecoder(response.Body).Decode(&cfg); err != nil {
		return nil, err
	}

	if cfg.EstablishmentID == "" || cfg.DeviceKey == "" {
		return nil, fmt.Errorf("pairing returned nothing usable")
	}

	return &cfg, nil
}
