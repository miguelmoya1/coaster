package repository

import (
	"testing"
	"time"
)

func TestValues(t *testing.T) {
	n := now()
	if n.Location() != time.UTC {
		t.Errorf("now().Location() = %v, want UTC", n.Location())
	}

	if got := utcOrNil(nil); got != nil {
		t.Errorf("utcOrNil(nil) = %v, want nil", got)
	}

	loc := time.FixedZone("TEST", 3600)
	local := time.Date(2026, 1, 2, 3, 4, 5, 0, loc)
	converted := utcOrNil(&local)
	if converted == nil || converted.Location() != time.UTC || !converted.Equal(local) {
		t.Errorf("utcOrNil(&local) = %v, want UTC equivalent", converted)
	}

	if got := nullIfEmpty(""); got != nil {
		t.Errorf("nullIfEmpty(\"\") = %v, want nil", got)
	}
	if got := nullIfEmpty("hello"); got == nil || *got != "hello" {
		t.Errorf("nullIfEmpty(\"hello\") = %v, want \"hello\"", got)
	}
}
