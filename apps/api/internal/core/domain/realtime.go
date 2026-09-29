package domain

import "encoding/json"

type RealtimeFrame struct {
	ID      string          `json:"id"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}
