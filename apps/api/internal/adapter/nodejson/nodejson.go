package nodejson

import (
	"bytes"
	"encoding/json"
)

func Marshal(v any) ([]byte, error) {
	var buf bytes.Buffer

	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(v); err != nil {
		return nil, err
	}

	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}
