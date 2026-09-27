package domain

import "encoding/json"

// RealtimeFrame is one message of an establishment's event stream (RealtimeFrame in
// Nest). ID is the publish time in milliseconds, as a string, and is what the browser
// sends back in Last-Event-ID. Payload is already JSON.
type RealtimeFrame struct {
	ID      string          `json:"id"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}
