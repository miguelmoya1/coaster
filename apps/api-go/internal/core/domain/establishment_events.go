package domain

type EstablishmentSettingsUpdated struct {
	EstablishmentID string
}

func (EstablishmentSettingsUpdated) Name() string { return "EstablishmentSettingsUpdatedEvent" }
