package domain

import (
	"database/sql/driver"
	"encoding/json/jsontext"
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

func OptionalTime(t *time.Time) *Time {
	if t == nil {
		return nil
	}
	return &Time{Time: *t}
}

func (t Time) MarshalJSONTo(enc *jsontext.Encoder) error {
	return enc.WriteToken(jsontext.String(t.UTC().Format(isoLayout)))
}

func (t Time) MarshalJSON() ([]byte, error) {
	return []byte(`"` + t.UTC().Format(isoLayout) + `"`), nil
}

func (t *Time) UnmarshalJSONFrom(dec *jsontext.Decoder) error {
	tok, err := dec.ReadToken()
	if err != nil {
		return err
	}
	switch tok.Kind() {
	case 'n':
		return nil
	case '"':
		parsed, err := time.Parse(time.RFC3339Nano, tok.String())
		if err != nil {
			return err
		}
		t.Time = parsed
		return nil
	default:
		return fmt.Errorf("cannot unmarshal %s into domain.Time", tok.Kind())
	}
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
