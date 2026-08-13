package pairing

import "testing"

func TestCodeFromName(t *testing.T) {
	cases := []struct {
		name string
		file string
		want string
	}{
		{"the name it was downloaded with", "coaster-printer-7F3KB92X.exe", "7F3KB92X"},
		{"the copy a browser makes of a repeat download", "coaster-printer-7F3KB92X (1).exe", "7F3KB92X"},
		{"a full Windows path", `C:\Users\Ana\Downloads\coaster-printer-7f3kb92x.exe`, "7F3KB92X"},
		{"a Linux binary with no extension", "/home/ana/coaster-printer-7F3KB92X", "7F3KB92X"},
		{"a file somebody renamed", "impresora.exe", ""},
		{"a code with characters we never issue", "coaster-printer-AEIOU111.exe", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := CodeFromName(tc.file); got != tc.want {
				t.Fatalf("CodeFromName(%q) = %q, want %q", tc.file, got, tc.want)
			}
		})
	}
}
