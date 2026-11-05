package nodejson

import "encoding/json/v2"

func Marshal(v any) ([]byte, error) {
	return json.Marshal(v, json.Deterministic(true))
}
