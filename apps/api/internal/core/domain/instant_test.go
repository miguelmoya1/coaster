package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestInstantMarshalsLikeTemporal(t *testing.T) {
	tests := []struct {
		in   time.Time
		want string
	}{
		{time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC), `"2026-09-27T10:00:00Z"`},
		{time.Date(2026, 9, 27, 10, 0, 0, 500_000_000, time.UTC), `"2026-09-27T10:00:00.5Z"`},
		{time.Date(2026, 9, 27, 10, 0, 0, 120_000_000, time.UTC), `"2026-09-27T10:00:00.12Z"`},
		{time.Date(2026, 9, 27, 10, 0, 0, 123_456_789, time.UTC), `"2026-09-27T10:00:00.123Z"`},
		{time.Date(2026, 9, 27, 12, 0, 0, 0, time.FixedZone("CEST", 2*60*60)), `"2026-09-27T10:00:00Z"`},
	}

	for _, tt := range tests {
		got, err := json.Marshal(NewInstant(tt.in))
		if err != nil || string(got) != tt.want {
			t.Errorf("Marshal(%s) = %s, %v; want %s", tt.in, got, err, tt.want)
		}
	}
}

func TestParseInstant(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"2026-09-27T10:00:00.000Z", "2026-09-27T10:00:00Z"},
		{"2026-09-27T12:00:00+02:00", "2026-09-27T10:00:00Z"},
		{"2026-09-27T12:00+02:00", "2026-09-27T10:00:00Z"},
		{"2026-09-27 10:00:00Z", "2026-09-27T10:00:00Z"},
		{"2026-09-27T10:00:00", ""},
		{"2026-09-27", ""},
		{"not a date", ""},
	}

	for _, tt := range tests {
		got, ok := ParseInstant(tt.in)
		if tt.want == "" {
			if ok {
				t.Errorf("ParseInstant(%q) = %s, want a failure", tt.in, got)
			}
			continue
		}
		if !ok || NewInstant(got).String() != tt.want {
			t.Errorf("ParseInstant(%q) = %s, %v; want %s", tt.in, got, ok, tt.want)
		}
	}
}

func TestParseDate(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"2026-09-27T10:00:00.123456Z", "2026-09-27T10:00:00.123Z"},
		{"2026-09-27T12:00:00+02:00", "2026-09-27T10:00:00.000Z"},
		{"2026-09-27", "2026-09-27T00:00:00.000Z"},
		{"2026-09-27T10:00", "2026-09-27T10:00:00.000Z"},
		{"2026-02-30", ""},
		{"ayer", ""},
	}

	for _, tt := range tests {
		got, ok := ParseDate(tt.in)
		if tt.want == "" {
			if ok {
				t.Errorf("ParseDate(%q) = %s, want a failure", tt.in, got)
			}
			continue
		}
		if !ok || FormatISO(got) != tt.want {
			t.Errorf("ParseDate(%q) = %s, %v; want %s", tt.in, got, ok, tt.want)
		}
	}
}
