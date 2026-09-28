package domain

import (
	"database/sql/driver"
	"fmt"
	"time"
)

const isoLayout = "2006-01-02T15:04:05.000Z"

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

func (t *Time) Scan(src any) error {
	value, ok := src.(time.Time)
	if !ok {
		return fmt.Errorf("cannot scan %T into domain.Time", src)
	}

	t.Time = value
	return nil
}

func (t Time) Value() (driver.Value, error) {
	return t.Time, nil
}
