package domain

// EstablishmentSettingsUpdated is EstablishmentSettingsUpdatedEvent: the settings of an
// establishment were saved. Its subscriber forgets the cached modules (modulesCacheKey).
type EstablishmentSettingsUpdated struct {
	EstablishmentID string
}

func (EstablishmentSettingsUpdated) Name() string { return "EstablishmentSettingsUpdatedEvent" }
