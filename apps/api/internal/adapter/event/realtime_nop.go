package event

type NopRealtime struct{}

func (NopRealtime) Publish(establishmentID string, event string, payload any) {}

func (NopRealtime) Revoke(establishmentID string, userID string) {}
