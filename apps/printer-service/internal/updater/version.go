package updater

import (
	"fmt"
	"strconv"
	"strings"
)

const CurrentVersion = "1.1.0"

func compareVersions(a, b string) (int, error) {
	partsA, err := parseVersion(a)
	if err != nil {
		return 0, err
	}
	partsB, err := parseVersion(b)
	if err != nil {
		return 0, err
	}

	for i := range max(len(partsA), len(partsB)) {
		var x, y int
		if i < len(partsA) {
			x = partsA[i]
		}
		if i < len(partsB) {
			y = partsB[i]
		}
		if x != y {
			if x < y {
				return -1, nil
			}
			return 1, nil
		}
	}

	return 0, nil
}

func parseVersion(v string) ([]int, error) {
	v = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(v), "v"))
	v, _, _ = strings.Cut(v, "-")
	v, _, _ = strings.Cut(v, "+")

	if v == "" {
		return nil, fmt.Errorf("empty version")
	}

	fields := strings.Split(v, ".")
	parts := make([]int, 0, len(fields))
	for _, field := range fields {
		n, err := strconv.Atoi(field)
		if err != nil {
			return nil, fmt.Errorf("invalid version %q: %w", v, err)
		}
		if n < 0 {
			return nil, fmt.Errorf("invalid version %q: negative component", v)
		}
		parts = append(parts, n)
	}

	return parts, nil
}
