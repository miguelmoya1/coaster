package service

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"io/fs"
	"log/slog"
	"strings"
	"sync"
	"time"

	"coaster-api/internal/core/domain"
)

const localPublicURL = "http://localhost:3000"

type PrinterReleaseService struct {
	downloads fs.FS
	publicURL string

	mu        sync.Mutex
	checksums map[string]binaryChecksum
}

type binaryChecksum struct {
	size    int64
	modTime time.Time
	sum     string
}

func NewPrinterReleaseService(downloads fs.FS, publicURL string) *PrinterReleaseService {
	return &PrinterReleaseService{downloads: downloads, publicURL: publicURL, checksums: make(map[string]binaryChecksum)}
}

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
		return domain.PrinterRelease{}, domain.NotFound(domain.MessagePrinterBinaryMissing)
	}

	return domain.PrinterRelease{
		Version: domain.PrinterBridgeVersion,
		URL:     s.baseURL() + "/public/downloads/" + filename,
		SHA256:  sum,
	}, nil
}

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

func (s *PrinterReleaseService) checksum(filename string) (sum string, found bool, err error) {
	binary, err := s.downloads.Open(filename)
	if err != nil {
		return "", false, nil
	}
	defer binary.Close()

	info, err := binary.Stat()
	if err != nil {
		return "", false, err
	}

	s.mu.Lock()
	cached, ok := s.checksums[filename]
	s.mu.Unlock()
	if ok && cached.size == info.Size() && cached.modTime.Equal(info.ModTime()) {
		return cached.sum, true, nil
	}

	hash := sha256.New()
	if _, err := io.Copy(hash, binary); err != nil {
		return "", false, err
	}
	sum = hex.EncodeToString(hash.Sum(nil))

	s.mu.Lock()
	s.checksums[filename] = binaryChecksum{size: info.Size(), modTime: info.ModTime(), sum: sum}
	s.mu.Unlock()

	return sum, true, nil
}
