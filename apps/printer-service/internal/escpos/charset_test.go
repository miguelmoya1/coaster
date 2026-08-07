package escpos

import (
	"bytes"
	"testing"
)

func TestEncode_SpanishAccentsAreSingleBytes(t *testing.T) {
	cp := CP858

	for _, tc := range []struct {
		text string
		want []byte
	}{
		{"Jamón", []byte{'J', 'a', 'm', 0xA2, 'n'}},
		{"Piña", []byte{'P', 'i', 0xA4, 'a'}},
		{"ESPAÑA", []byte{'E', 'S', 'P', 'A', 0xA5, 'A'}},
		{"café", []byte{'c', 'a', 'f', 0x82}},
		{"sidra 1€", []byte{'s', 'i', 'd', 'r', 'a', ' ', '1', 0xD5}},
	} {
		got := cp.Encode(cp.Sanitize(tc.text))
		if !bytes.Equal(got, tc.want) {
			t.Errorf("Encode(%q) = % x, want % x", tc.text, got, tc.want)
		}
	}
}

func TestSanitize_KeepsOneRunePerPrintedCharacter(t *testing.T) {
	cp := CP858
	sanitized := cp.Sanitize("Piña colada ñ á é í ó ú ü ç")

	if got, want := len(cp.Encode(sanitized)), len([]rune(sanitized)); got != want {
		t.Errorf("encoded to %d bytes for %d runes; layout maths would break", got, want)
	}
}

func TestSanitize_FoldsTypography(t *testing.T) {
	cp := CP858

	for _, tc := range []struct{ in, want string }{
		{"Gin’s tonic", "Gin's tonic"},
		{"Menú – del día", "Menú - del día"},
		{"Tapas…", "Tapas..."},
		{"café solo", "café solo"},
	} {
		if got := cp.Sanitize(tc.in); got != tc.want {
			t.Errorf("Sanitize(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestSanitize_FallsBackWhenTheCodePageLacksTheCharacter(t *testing.T) {
	if got := CP437.Sanitize("1€"); got != "1EUR" {
		t.Errorf("CP437.Sanitize(\"1€\") = %q, want %q", got, "1EUR")
	}
	if got := CP858.Sanitize("1€"); got != "1€" {
		t.Errorf("CP858 should keep the euro sign, got %q", got)
	}
}

func TestSanitize_StripsOnlyTheAccentsItCannotRepresent(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"Żywiec", "Zywiec"},
		{"Plzeňský", "Plzenský"},
		{"Łódź", "Lódz"},
		{"Kotányi", "Kotányi"},
	} {
		if got := CP858.Sanitize(tc.in); got != tc.want {
			t.Errorf("Sanitize(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestSanitize_ReplacesUnmappableCharacters(t *testing.T) {
	got := CP858.Sanitize("Sake 日本")
	if got != "Sake ??" {
		t.Errorf("Sanitize = %q, want %q", got, "Sake ??")
	}
}

func TestLookupCodePage(t *testing.T) {
	for _, name := range []string{"cp858", "CP850", " cp437 ", "cp1252"} {
		if _, err := LookupCodePage(name); err != nil {
			t.Errorf("LookupCodePage(%q) returned %v", name, err)
		}
	}

	if _, err := LookupCodePage("utf8"); err == nil {
		t.Error("expected an error for an unsupported code page")
	}
}
