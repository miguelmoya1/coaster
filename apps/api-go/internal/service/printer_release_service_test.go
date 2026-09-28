package service

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"testing"
	"testing/fstest"

	"api-go/internal/core/domain"
)

func TestPrinterReleaseServiceLatest(t *testing.T) {
	downloads := fstest.MapFS{"printer-service-linux": {Data: []byte("the linux bridge")}}
	sum := sha256.Sum256([]byte("the linux bridge"))

	releases := NewPrinterReleaseService(downloads, "https://api.example.com//")

	release, err := releases.Latest("linux")
	if err != nil {
		t.Fatal(err)
	}
	want := domain.PrinterRelease{
		Version: "1.2.0",
		URL:     "https://api.example.com/public/downloads/printer-service-linux",
		SHA256:  hex.EncodeToString(sum[:]),
	}
	if release != want {
		t.Errorf("release = %+v\nwant      %+v", release, want)
	}

	downloads["printer-service-linux"] = &fstest.MapFile{Data: []byte("a bridge published later")}
	later := sha256.Sum256([]byte("a bridge published later"))
	if again, _ := releases.Latest("linux"); again.SHA256 != hex.EncodeToString(later[:]) {
		t.Errorf("a new binary kept the old checksum: %s", again.SHA256)
	}

	if _, err := releases.Latest("windows"); !isPrinterError(err, domain.KindNotFound, domain.MessagePrinterBinaryMissing) {
		t.Errorf("Latest of an OS without its binary = %v, want 404 %q", err, domain.MessagePrinterBinaryMissing)
	}

	for _, platform := range []string{"mac", ""} {
		if _, err := releases.Latest(platform); !isPrinterError(err, domain.KindBadRequest, domain.MessageUnsupportedPrinterOS) {
			t.Errorf("Latest(%q) = %v, want 400 %q", platform, err, domain.MessageUnsupportedPrinterOS)
		}
	}

	local, _ := NewPrinterReleaseService(downloads, "").Latest("linux")
	if local.URL != "http://localhost:3000/public/downloads/printer-service-linux" {
		t.Errorf("without PUBLIC_URL the URL = %q", local.URL)
	}
}

func TestPrinterReleaseServiceDownload(t *testing.T) {
	downloads := fstest.MapFS{"printer-service-windows.exe": {Data: []byte("the windows bridge")}}
	releases := NewPrinterReleaseService(downloads, "")

	tests := []struct {
		name     string
		platform string
		code     string
		wantName string
		kind     domain.ErrorKind
		wantCode string
	}{
		{name: "windows", platform: "windows", code: "7f3kb92x", wantName: "coaster-printer-7F3KB92X.exe"},
		{name: "a longer code", platform: "windows", code: "7F3KB92X/../etc", wantName: "coaster-printer-7F3KB92X.exe"},
		{name: "no binary yet", platform: "linux", code: "7F3KB92X", kind: domain.KindNotFound, wantCode: domain.CodePrinterNotConfigured},
		{name: "unknown OS", platform: "mac", code: "7F3KB92X", kind: domain.KindBadRequest, wantCode: domain.CodeInvalidType},
		{name: "no code", platform: "windows", kind: domain.KindBadRequest, wantCode: domain.CodeInvalidType},
		{name: "a code with vowels", platform: "windows", code: "AEIOUAEI", kind: domain.KindBadRequest, wantCode: domain.CodeInvalidType},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			binary, name, err := releases.Download(tt.platform, tt.code)

			if tt.wantCode != "" {
				if !isPrinterError(err, tt.kind, tt.wantCode) {
					t.Fatalf("Download = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			defer binary.Close()

			content, _ := io.ReadAll(binary)
			if name != tt.wantName || string(content) != "the windows bridge" {
				t.Errorf("Download = %q with %q", name, content)
			}
		})
	}
}
