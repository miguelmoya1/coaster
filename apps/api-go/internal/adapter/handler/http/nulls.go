package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

func decodeJSONWithNulls(r *http.Request, dst any) (map[string]bool, error) {

	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	r.Body = io.NopCloser(bytes.NewReader(body))

	if err := decodeJSON(r, dst); err != nil {
		return nil, err
	}

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
