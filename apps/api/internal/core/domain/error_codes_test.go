package domain

import (
	"os"
	"regexp"
	"slices"
	"testing"
)

const errorTypesPath = "../../../../../apps/web/src/app/core/errors/error.types.ts"

func TestErrorCodesMatchTheWeb(t *testing.T) {
	source, err := os.ReadFile(errorTypesPath)
	if err != nil {
		t.Fatalf("reading %s: %v", errorTypesPath, err)
	}

	entry := regexp.MustCompile(`(?m)^\s+([A-Z0-9_]+): '([A-Z0-9_]+)',`)

	var want []string
	for _, match := range entry.FindAllStringSubmatch(string(source), -1) {
		if match[1] != match[2] {
			t.Errorf("ErrorCodes.%s is %q; expected the key and the value to be the same", match[1], match[2])
		}
		want = append(want, match[2])
	}

	if len(want) == 0 {
		t.Fatal("found no codes in error.types.ts")
	}

	if !slices.Equal(AllErrorCodes, want) {
		for _, code := range want {
			if !slices.Contains(AllErrorCodes, code) {
				t.Errorf("missing in Go: %s", code)
			}
		}
		for _, code := range AllErrorCodes {
			if !slices.Contains(want, code) {
				t.Errorf("missing in the web: %s", code)
			}
		}
		t.Error("AllErrorCodes does not match ErrorCodes in the web")
	}
}
