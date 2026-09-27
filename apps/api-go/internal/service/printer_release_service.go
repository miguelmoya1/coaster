package service

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"io/fs"
	"log/slog"
	"strings"
	"sync"

	"api-go/internal/core/domain"
)

// localPublicURL is where the downloads are advertised without PUBLIC_URL, as in Nest.
const localPublicURL = "http://localhost:3000"

// PrinterReleaseService is PrinterReleaseService of Nest: the bridge binaries of
// public/downloads, the version the bridges update to with the checksum of each binary, and
// the download named with a pairing code.
type PrinterReleaseService struct {
	downloads fs.FS
	publicURL string

	mu        sync.Mutex
	checksums map[string]string
}

// NewPrinterReleaseService reads the binaries from downloads (public/downloads) and
// advertises them under publicURL (PUBLIC_URL).
func NewPrinterReleaseService(downloads fs.FS, publicURL string) *PrinterReleaseService {
	return &PrinterReleaseService{downloads: downloads, publicURL: publicURL, checksums: make(map[string]string)}
}

// Latest is GET printer/check-version: the release for the operating system. An operating
// system without a binary is a 400, as in Nest.
func (s *PrinterReleaseService) Latest(platform string) (domain.PrinterRelease, error) {
	filename := domain.PrinterBinaryFor(platform)
	if filename == "" {
		return domain.PrinterRelease{}, domain.BadRequest(domain.MessageUnsupportedPrinterOS)
	}

	sum, found, err := s.checksum(filename)
	if err != nil {
		return domain.PrinterRelease{}, err
	}
	if !found {
		slog.Error("no bridge binary in public/downloads; bridges on this OS cannot update until it is published",
			"file", filename, "os", platform)
		return domain.PrinterRelease{}, domain.BadRequest(domain.MessageUnsupportedPrinterOS)
	}

	return domain.PrinterRelease{
		Version: domain.PrinterBridgeVersion,
		URL:     s.baseURL() + "/public/downloads/" + filename,
		SHA256:  sum,
	}, nil
}

// Download is GET printer/download: the binary for the operating system, and the name it is
// downloaded with, which carries the pairing code. The caller closes the file.
func (s *PrinterReleaseService) Download(platform, code string) (fs.File, string, error) {
	filename := domain.PrinterBinaryFor(platform)
	pairingCode := domain.PairingCodeFromFilename("coaster-printer-" + strings.ToUpper(code))

	if filename == "" || pairingCode == "" {
		return nil, "", domain.BadRequest(domain.CodeInvalidType)
	}

	binary, err := s.downloads.Open(filename)
	if err != nil {
		return nil, "", domain.NotFound(domain.CodePrinterNotConfigured)
	}

	return binary, domain.PrinterDownloadName(platform, pairingCode), nil
}

func (s *PrinterReleaseService) baseURL() string {
	if s.publicURL == "" {
		slog.Warn("PUBLIC_URL is not set; advertising downloads on localhost, which no establishment can reach")
		return localPublicURL
	}

	return strings.TrimRight(s.publicURL, "/")
}

// checksum is the SHA-256 of the binary, in hex. It is worked out once per binary and kept,
// as in Nest; found is false when the binary is not there.
func (s *PrinterReleaseService) checksum(filename string) (sum string, found bool, err error) {
	s.mu.Lock()
	cached, ok := s.checksums[filename]
	s.mu.Unlock()
	if ok {
		return cached, true, nil
	}

	binary, err := s.downloads.Open(filename)
	if err != nil {
		return "", false, nil
	}
	defer binary.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, binary); err != nil {
		return "", false, err
	}
	sum = hex.EncodeToString(hash.Sum(nil))

	s.mu.Lock()
	s.checksums[filename] = sum
	s.mu.Unlock()

	return sum, true, nil
}
