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

var codePattern = regexp.MustCompile(`(?i)coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})`)

type Config struct {
	EstablishmentID string `json:"establishmentId"`
	DeviceKey       string `json:"deviceKey"`
}

func CodeFromName(name string) string {
	match := codePattern.FindStringSubmatch(filepath.Base(name))
	if match == nil {
		return ""
	}

	return strings.ToUpper(match[1])
}

func configPath() (string, error) {
	executable, err := os.Executable()
	if err != nil {
		return "", err
	}

	return filepath.Join(filepath.Dir(executable), configFileName), nil
}

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
