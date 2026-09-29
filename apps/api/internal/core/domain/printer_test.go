package domain

import (
	"strings"
	"testing"
)

func TestNewPairingCode(t *testing.T) {
	seen := make(map[string]bool)

	for range 500 {
		code := NewPairingCode()

		if len(code) != PairingCodeLength {
			t.Fatalf("code %q has %d characters", code, len(code))
		}
		if strings.ContainsAny(code, "AEIOU01") {
			t.Fatalf("code %q has a character people mistype", code)
		}
		if PairingCodeFromFilename("coaster-printer-"+code) != code {
			t.Fatalf("code %q cannot be read back from a filename", code)
		}
		if seen[code] {
			t.Fatalf("code %q came out twice", code)
		}
		seen[code] = true
	}
}

func TestPairingCodeFromFilename(t *testing.T) {
	tests := []struct {
		filename string
		want     string
	}{
		{filename: "coaster-printer-7F3KB92X.exe", want: "7F3KB92X"},
		{filename: "coaster-printer-7F3KB92X (1).exe", want: "7F3KB92X"},
		{filename: `C:\Users\Ana\Downloads\coaster-printer-7f3kb92x.exe`, want: "7F3KB92X"},
		{filename: "coaster-printer-7F3KB92XEXTRA", want: "7F3KB92X"},
		{filename: "coaster-printer-7F3KB92", want: ""},
		{filename: "coaster-printer-AEIOU017", want: ""},
		{filename: "impresora.exe", want: ""},
	}

	for _, tt := range tests {
		if got := PairingCodeFromFilename(tt.filename); got != tt.want {
			t.Errorf("PairingCodeFromFilename(%q) = %q, want %q", tt.filename, got, tt.want)
		}
	}
}

func TestPrinterBinaries(t *testing.T) {
	tests := []struct {
		platform     string
		binary       string
		downloadName string
	}{
		{platform: "windows", binary: "printer-service-windows.exe", downloadName: "coaster-printer-7F3KB92X.exe"},
		{platform: "linux", binary: "printer-service-linux", downloadName: "coaster-printer-7F3KB92X"},
		{platform: "mac", binary: ""},
		{platform: "", binary: ""},
	}

	for _, tt := range tests {
		if got := PrinterBinaryFor(tt.platform); got != tt.binary {
			t.Errorf("PrinterBinaryFor(%q) = %q, want %q", tt.platform, got, tt.binary)
		}
		if tt.binary != "" && PrinterDownloadName(tt.platform, "7F3KB92X") != tt.downloadName {
			t.Errorf("PrinterDownloadName(%q) = %q, want %q", tt.platform, PrinterDownloadName(tt.platform, "7F3KB92X"), tt.downloadName)
		}
	}
}
