package domain

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"strings"
	"time"
)

const (
	DefaultPrinterPort = 8080

	PrinterOnlineWindow = 2 * time.Minute

	PrinterTokenTTL = 8 * 24 * time.Hour
)

const (
	MessageUnsupportedPrinterOS    = `Unsupported OS. Use "windows" or "linux".`
	MessagePrinterBinaryMissing    = "No bridge binary is published for this OS yet"
	MessageDeviceKeyRequired       = "X-Device-Key header is required"
	MessageEstablishmentIDRequired = "establishmentId is required"
)

type PrinterConfig struct {
	EstablishmentID string
	DeviceKey       string
	IPAddress       *string
	Port            int
	LastSeenAt      *time.Time
}

type PrinterStatus struct {
	EstablishmentID string  `json:"establishmentId"`
	IsOnline        bool    `json:"isOnline"`
	IPAddress       *string `json:"ipAddress"`
	Port            int     `json:"port"`
	LastSeenAt      *Time   `json:"lastSeenAt"`
}

type PrinterConnection struct {
	IPAddress string `json:"ipAddress"`
	Port      int    `json:"port"`
	Token     string `json:"token"`
}

type PrinterDeviceKey struct {
	DeviceKey string `json:"deviceKey"`
}

type PrinterPairingCode struct {
	Code string `json:"code"`
}

type PrinterPairing struct {
	EstablishmentID string `json:"establishmentId"`
	DeviceKey       string `json:"deviceKey"`
}

const (
	PairingCodeLength = 8

	PairingCodeTTL = 60 * time.Minute
)

const pairingAlphabet = "23456789BCDFGHJKLMNPQRSTVWXZ"

var pairingCodeInFilename = regexp.MustCompile(`(?i)coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})`)

func NewPairingCode() string {
	size := big.NewInt(int64(len(pairingAlphabet)))

	code := make([]byte, PairingCodeLength)
	for i := range code {

		n, _ := rand.Int(rand.Reader, size)
		code[i] = pairingAlphabet[n.Int64()]
	}

	return string(code)
}

func PairingCodeFromFilename(filename string) string {
	match := pairingCodeInFilename.FindStringSubmatch(filename)
	if match == nil {
		return ""
	}

	return strings.ToUpper(match[1])
}

const PrinterBridgeVersion = "1.2.0"

var printerBinaries = map[string]string{
	"windows": "printer-service-windows.exe",
	"linux":   "printer-service-linux",
}

func PrinterBinaryFor(platform string) string {
	return printerBinaries[platform]
}

func PrinterDownloadName(platform, code string) string {
	if platform == "windows" {
		return "coaster-printer-" + code + ".exe"
	}

	return "coaster-printer-" + code
}

type PrinterRelease struct {
	Version string `json:"version"`
	URL     string `json:"url"`
	SHA256  string `json:"sha256"`
}
