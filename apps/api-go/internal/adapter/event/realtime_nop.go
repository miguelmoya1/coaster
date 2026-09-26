package event

// NopRealtime is a ports.Realtime that sends nothing. main uses it until the SSE
// streams exist (P2f).
type NopRealtime struct{}

func (NopRealtime) Publish(establishmentID string, event string, payload any) {}

func (NopRealtime) Revoke(establishmentID string, userID string) {}
