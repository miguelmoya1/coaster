package config

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"printer-service/internal/escpos"
)

const DefaultAPIURL = "https://api.coaster.business/api/v1"

type PrinterType string

const (
	PrinterTypeUSB     PrinterType = "usb"
	PrinterTypeNetwork PrinterType = "network"
)

const (
	minPrintWidth = 16
	maxPrintWidth = 96
)

type Config struct {
	APIURL         string
	Port           string
	PrinterType    PrinterType
	PrinterPath    string
	PrintWidth     int
	CodePage       escpos.CodePage
	BarID          string
	DeviceKey      string
	IPAddress      string
	JWTSecret      string
	AllowedOrigins []string
	UpdateInterval time.Duration
	PollInterval   time.Duration
	Insecure       bool
}

func Parse(args []string) (*Config, error) {
	fs := flag.NewFlagSet("server", flag.ContinueOnError)

	apiURL := fs.String("api-url", DefaultAPIURL, "Base URL of the Coaster API")
	isLocal := fs.Bool("local", false, "Use localhost:3000 as the API backend")
	port := fs.String("port", "8080", "Port for the local HTTP server")
	printerType := fs.String("printer-type", string(PrinterTypeUSB), "Printer type (usb or network)")
	printerPath := fs.String("printer-path", "", "Device path, printer name or IP:port")
	printWidth := fs.Int("print-width", escpos.Width58mm, "Characters per line: 32 for 58mm paper, 48 for 80mm")
	codePage := fs.String("code-page", escpos.CP858.Name, "Printer character table (cp858, cp850, cp437, cp1252)")
	barID := fs.String("bar-id", "", "ID of the bar this bridge belongs to")
	deviceKey := fs.String("device-key", "", "Device key issued by the Coaster API")
	ipAddress := fs.String("ip-address", "", "Override the auto-detected local IP address")
	jwtSecret := fs.String("jwt-secret", "", "Shared secret used to validate incoming print requests")
	allowedOrigins := fs.String("allowed-origins", "https://coaster.business,http://localhost:4200", "Comma-separated list of allowed CORS origins")
	updateInterval := fs.Duration("update-interval", 6*time.Hour, "How often to check for a new version (0 disables periodic checks)")
	pollInterval := fs.Duration("poll-interval", 2*time.Second, "Delay between print job polls after an empty response")
	insecure := fs.Bool("insecure", false, "Allow the local print endpoint to run without a JWT secret")

	if err := fs.Parse(args); err != nil {
		return nil, err
	}

	if *isLocal {
		*apiURL = "http://localhost:3000/api/v1"
	}

	fallbackToEnv(barID, "BAR_ID")
	fallbackToEnv(deviceKey, "PRINTER_DEVICE_KEY")
	fallbackToEnv(ipAddress, "PRINTER_IP_ADDRESS")
	fallbackToEnv(jwtSecret, "PRINTER_JWT_SECRET")

	kind := PrinterType(*printerType)
	if kind != PrinterTypeUSB && kind != PrinterTypeNetwork {
		return nil, fmt.Errorf("invalid -printer-type %q: expected %q or %q", *printerType, PrinterTypeUSB, PrinterTypeNetwork)
	}

	if kind == PrinterTypeNetwork && *printerPath == "" {
		return nil, fmt.Errorf("-printer-type=network requires -printer-path with the printer's address, for example 192.168.1.200")
	}

	if *printWidth < minPrintWidth || *printWidth > maxPrintWidth {
		return nil, fmt.Errorf("invalid -print-width %d: expected between %d and %d", *printWidth, minPrintWidth, maxPrintWidth)
	}

	page, err := escpos.LookupCodePage(*codePage)
	if err != nil {
		return nil, err
	}

	return &Config{
		APIURL:         strings.TrimRight(*apiURL, "/"),
		Port:           *port,
		PrinterType:    kind,
		PrinterPath:    *printerPath,
		PrintWidth:     *printWidth,
		CodePage:       page,
		BarID:          *barID,
		DeviceKey:      *deviceKey,
		IPAddress:      *ipAddress,
		JWTSecret:      *jwtSecret,
		AllowedOrigins: parseOrigins(*allowedOrigins),
		UpdateInterval: *updateInterval,
		PollInterval:   *pollInterval,
		Insecure:       *insecure,
	}, nil
}

func (c *Config) RelayEnabled() bool {
	return c.BarID != "" && c.DeviceKey != ""
}

func fallbackToEnv(value *string, name string) {
	if *value == "" {
		*value = os.Getenv(name)
	}
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			origins = append(origins, p)
		}
	}
	return origins
}
