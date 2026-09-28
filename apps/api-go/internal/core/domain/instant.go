package domain

import (
	"strings"
	"time"
)

const instantLayout = "2006-01-02T15:04:05.999Z"

type Instant struct {
	time.Time
}

func NewInstant(t time.Time) Instant {
	return Instant{Time: t}
}

func (i Instant) String() string {
	return i.UTC().Truncate(time.Millisecond).Format(instantLayout)
}

func (i Instant) MarshalJSON() ([]byte, error) {
	return []byte(`"` + i.String() + `"`), nil
}

func FormatISO(t time.Time) string {
	return t.UTC().Format(isoLayout)
}

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
