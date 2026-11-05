package domain

import "encoding/json/jsontext"

type RealtimeFrame struct {
	ID      string         `json:"id"`
	Event   string         `json:"event"`
	Payload jsontext.Value `json:"payload"`
}
