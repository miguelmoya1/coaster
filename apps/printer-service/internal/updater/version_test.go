package updater

import "testing"

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"1.0.0", "1.0.0", 0},
		{"1.0.1", "1.0.0", 1},
		{"1.0.0", "1.0.1", -1},
		{"1.10.0", "1.9.0", 1},
		{"2.0.0", "1.99.99", 1},
		{"1.1", "1.1.0", 0},
		{"v1.2.0", "1.2.0", 0},
		{"1.2.0-rc1", "1.2.0", 0},
		{"1.2.0+build7", "1.2.0", 0},
	}

	for _, tc := range tests {
		got, err := compareVersions(tc.a, tc.b)
		if err != nil {
			t.Errorf("compareVersions(%q, %q) returned %v", tc.a, tc.b, err)
			continue
		}
		if got != tc.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}

func TestCompareVersions_RejectsGarbage(t *testing.T) {
	for _, v := range []string{"", "latest", "1.x.0", "-1.0.0"} {
		if _, err := compareVersions(v, "1.0.0"); err == nil {
			t.Errorf("expected an error for version %q", v)
		}
	}
}

func TestCurrentVersionIsParseable(t *testing.T) {
	if _, err := parseVersion(CurrentVersion); err != nil {
		t.Fatalf("CurrentVersion %q is not a usable version: %v", CurrentVersion, err)
	}
}
