package domain

import (
	"strings"
	"time"
)

// instantLayout writes the milliseconds only when there are some, and without trailing
// zeros, like Temporal.Instant.toString: "10:00:00Z", "10:00:00.5Z", "10:00:00.123Z".
const instantLayout = "2006-01-02T15:04:05.999Z"

// Instant is a time.Time that writes JSON like Temporal.Instant.toString, which is what Nest
// sends for shifts and shift exchanges. Everything else goes out as Time (toISOString).
type Instant struct {
	time.Time
}

func NewInstant(t time.Time) Instant {
	return Instant{Time: t}
}

// String is the instant as Temporal writes it.
func (i Instant) String() string {
	return i.UTC().Truncate(time.Millisecond).Format(instantLayout)
}

func (i Instant) MarshalJSON() ([]byte, error) {
	return []byte(`"` + i.String() + `"`), nil
}

// FormatISO writes t like Date.toISOString: "2026-09-27T10:00:00.000Z".
func FormatISO(t time.Time) string {
	return t.UTC().Format(isoLayout)
}

// ParseInstant reads what Temporal.Instant.from accepts: a date and a time with an offset
// ("2026-09-27T10:00:00Z", "2026-09-27T12:00+02:00"). Without the offset it fails.
func ParseInstant(value string) (time.Time, bool) {
	normalized := strings.Replace(value, ",", ".", 1)
	if len(normalized) > 10 && (normalized[10] == ' ' || normalized[10] == 't') {
		normalized = normalized[:10] + "T" + normalized[11:]
	}
	normalized = strings.Replace(normalized, "z", "Z", 1)

	for _, layout := range []string{
		"2006-01-02T15:04:05.999999999Z07:00",
		"2006-01-02T15:04:05.999999999Z0700",
		"2006-01-02T15:04:05.999999999Z07",
		"2006-01-02T15:04Z07:00",
		"2006-01-02T15:04Z0700",
		"2006-01-02T15:04Z07",
	} {
		if parsed, err := time.Parse(layout, normalized); err == nil {
			return parsed.UTC(), true
		}
	}

	return time.Time{}, false
}

// ParseDate reads a date the way new Date(value) does for the ISO 8601 forms: a date alone
// is midnight UTC, and a date and time without an offset is taken as UTC (the server's zone).
func ParseDate(value string) (time.Time, bool) {
	if parsed, ok := ParseInstant(value); ok {
		return parsed.Truncate(time.Millisecond), true
	}

	normalized := strings.Replace(value, ",", ".", 1)
	if len(normalized) > 10 && normalized[10] == ' ' {
		normalized = normalized[:10] + "T" + normalized[11:]
	}

	for _, layout := range []string{
		"2006-01-02",
		"2006-01-02T15:04:05.999999999",
		"2006-01-02T15:04",
	} {
		if parsed, err := time.Parse(layout, normalized); err == nil {
			return parsed.Truncate(time.Millisecond), true
		}
	}

	return time.Time{}, false
}
