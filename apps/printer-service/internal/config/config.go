package config

import (
	"flag"
	"os"
	"strings"
)

type Config struct {
	APIURL         string
	Port           string
	PrinterType    string // "usb" or "network"
	PrinterPath    string
	BarID          string
	DeviceKey      string
	IPAddress      string
	JWTSecret      string
	AllowedOrigins []string
}

func Parse(args []string) (*Config, error) {
	fs := flag.NewFlagSet("server", flag.ContinueOnError)

	apiURL := fs.String("api-url", "https://api-774617138158.europe-southwest1.run.app/api/v1", "URL base de la API")
	isLocal := fs.Bool("local", false, "Usa localhost:3000 como backend de la API")
	port := fs.String("port", "8080", "Puerto para el servidor HTTP local")
	printerType := fs.String("printer-type", "usb", "Tipo de impresora (usb o network)")
	printerPath := fs.String("printer-path", "", "Ruta o IP de la impresora")
	barID := fs.String("bar-id", "", "ID of the bar/restaurant (required)")
	deviceKey := fs.String("device-key", "", "API key / device key for the printer (required)")
	ipAddress := fs.String("ip-address", "", "Override auto-detected local IP address")
	jwtSecret := fs.String("jwt-secret", "", "Shared secret key to validate incoming JWTs")
	allowedOrigins := fs.String("allowed-origins", "https://coaster.business,http://localhost:4200", "Comma-separated list of allowed CORS origins")

	if err := fs.Parse(args); err != nil {
		return nil, err
	}

	if *isLocal {
		*apiURL = "http://localhost:3000/api/v1"
	}

	if *barID == "" {
		*barID = os.Getenv("BAR_ID")
	}
	if *deviceKey == "" {
		*deviceKey = os.Getenv("PRINTER_DEVICE_KEY")
	}
	if *ipAddress == "" {
		*ipAddress = os.Getenv("PRINTER_IP_ADDRESS")
	}
	if *jwtSecret == "" {
		*jwtSecret = os.Getenv("PRINTER_JWT_SECRET")
	}

	origins := parseOrigins(*allowedOrigins)

	return &Config{
		APIURL:         *apiURL,
		Port:           *port,
		PrinterType:    *printerType,
		PrinterPath:    *printerPath,
		BarID:          *barID,
		DeviceKey:      *deviceKey,
		IPAddress:      *ipAddress,
		JWTSecret:      *jwtSecret,
		AllowedOrigins: origins,
	}, nil
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
