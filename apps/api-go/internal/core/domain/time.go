package domain

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// isoLayout is the format of JavaScript's Date.toISOString, which is what Nest sends.
const isoLayout = "2006-01-02T15:04:05.000Z"

// Time is a time.Time that reads and writes JSON like a JavaScript Date:
// always UTC and always with milliseconds ("2026-09-27T10:00:00.000Z").
type Time struct {
	time.Time
}

func NewTime(t time.Time) Time {
	return Time{Time: t}
}

func (t Time) MarshalJSON() ([]byte, error) {
	return []byte(`"` + t.UTC().Format(isoLayout) + `"`), nil
}

func (t *Time) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	parsed, err := time.Parse(`"`+time.RFC3339Nano+`"`, string(data))
	if err != nil {
		return err
	}

	t.Time = parsed
	return nil
}

// Scan lets pgx read a timestamp column straight into a Time.
func (t *Time) Scan(src any) error {
	value, ok := src.(time.Time)
	if !ok {
		return fmt.Errorf("cannot scan %T into domain.Time", src)
	}

	t.Time = value
	return nil
}

// Value lets pgx write a Time as a timestamp.
func (t Time) Value() (driver.Value, error) {
	return t.Time, nil
}
