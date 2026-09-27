package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

// decodeJSONWithNulls is decodeJSON that also says which top-level fields were sent as null.
// A pointer field is nil both when the field is missing and when it is null; an update needs
// to tell them apart, because null empties the column and a missing field leaves it alone.
func decodeJSONWithNulls(r *http.Request, dst any) (map[string]bool, error) {
	// One byte over the limit is enough for decodeJSON to answer 413.
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	r.Body = io.NopCloser(bytes.NewReader(body))

	if err := decodeJSON(r, dst); err != nil {
		return nil, err
	}

	// decodeJSON already checked that the body is an object (or empty, which has no nulls).
	var fields map[string]json.RawMessage
	_ = json.Unmarshal(body, &fields)

	nulls := make(map[string]bool)
	for name, value := range fields {
		if string(value) == "null" {
			nulls[name] = true
		}
	}
	return nulls, nil
}
