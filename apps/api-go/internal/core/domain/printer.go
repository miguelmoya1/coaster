package domain

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"strings"
	"time"
)

// The printer bridge is the program that runs in the establishment and prints its tickets
// (apps/printer-service). It pairs with a code, then authenticates with its device key.

const (
	// DefaultPrinterPort is where a bridge listens when it has not said otherwise.
	DefaultPrinterPort = 8080
	// PrinterOnlineWindow is how recently the bridge has to have called to count as online.
	PrinterOnlineWindow = 2 * time.Minute
	// PrinterTokenTTL is how long the token of GET printer/connection lasts.
	PrinterTokenTTL = 8 * 24 * time.Hour
)

// The messages Nest answers with where it has no error code.
const (
	MessageUnsupportedPrinterOS    = `Unsupported OS. Use "windows" or "linux".`
	MessagePrinterBinaryMissing    = "No bridge binary is published for this OS yet"
	MessageDeviceKeyRequired       = "X-Device-Key header is required"
	MessageEstablishmentIDRequired = "establishmentId is required"
)

// PrinterConfig is the bridge of an establishment: the key it authenticates with and where it
// was last seen on the local network.
type PrinterConfig struct {
	EstablishmentID string
	DeviceKey       string
	IPAddress       *string
	Port            int
	LastSeenAt      *time.Time
}

// PrinterStatus is PrinterStatusDto.
type PrinterStatus struct {
	EstablishmentID string  `json:"establishmentId"`
	IsOnline        bool    `json:"isOnline"`
	IPAddress       *string `json:"ipAddress"`
	Port            int     `json:"port"`
	LastSeenAt      *Time   `json:"lastSeenAt"`
}

// PrinterConnection is PrinterConnectionDetailsDto: where the web app finds the bridge on the
// local network, and the token the bridge accepts from it.
type PrinterConnection struct {
	IPAddress string `json:"ipAddress"`
	Port      int    `json:"port"`
	Token     string `json:"token"`
}

// PrinterDeviceKey is GenerateDeviceKeyResponseDto.
type PrinterDeviceKey struct {
	DeviceKey string `json:"deviceKey"`
}

// PrinterPairingCode is PrinterPairingCodeResponse.
type PrinterPairingCode struct {
	Code string `json:"code"`
}

// PrinterPairing is PrinterPairingResult: what a bridge gets for its pairing code.
type PrinterPairing struct {
	EstablishmentID string `json:"establishmentId"`
	DeviceKey       string `json:"deviceKey"`
}

const (
	// PairingCodeLength is how many characters a pairing code has.
	PairingCodeLength = 8
	// PairingCodeTTL is how long a pairing code can wait to be redeemed.
	PairingCodeTTL = 60 * time.Minute
)

// pairingAlphabet leaves out the vowels, 0 and 1, which people mistype.
const pairingAlphabet = "23456789BCDFGHJKLMNPQRSTVWXZ"

var pairingCodeInFilename = regexp.MustCompile(`(?i)coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})`)

// NewPairingCode draws a random code of PairingCodeLength characters of pairingAlphabet.
func NewPairingCode() string {
	size := big.NewInt(int64(len(pairingAlphabet)))

	code := make([]byte, PairingCodeLength)
	for i := range code {
		// rand.Int only fails when the reader does, and crypto/rand's never does.
		n, _ := rand.Int(rand.Reader, size)
		code[i] = pairingAlphabet[n.Int64()]
	}

	return string(code)
}

// PairingCodeFromFilename is codeFromFilename: the code in the name a bridge was downloaded
// with, in upper case, or "" when there is none.
func PairingCodeFromFilename(filename string) string {
	match := pairingCodeInFilename.FindStringSubmatch(filename)
	if match == nil {
		return ""
	}

	return strings.ToUpper(match[1])
}

// PrinterBridgeVersion is the version of the bridge binaries in public/downloads.
const PrinterBridgeVersion = "1.2.0"

// printerBinaries is the binary in public/downloads for each operating system.
var printerBinaries = map[string]string{
	"windows": "printer-service-windows.exe",
	"linux":   "printer-service-linux",
}

// PrinterBinaryFor is binaryFor: the binary for the operating system, or "" when there is none.
func PrinterBinaryFor(platform string) string {
	return printerBinaries[platform]
}

// PrinterDownloadName is downloadNameFor: the name the binary is downloaded with, which
// carries the pairing code.
func PrinterDownloadName(platform, code string) string {
	if platform == "windows" {
		return "coaster-printer-" + code + ".exe"
	}

	return "coaster-printer-" + code
}

// PrinterRelease is what GET printer/check-version answers: the version the bridges update
// to, where to download it and the checksum of the binary.
type PrinterRelease struct {
	Version string `json:"version"`
	URL     string `json:"url"`
	SHA256  string `json:"sha256"`
}
