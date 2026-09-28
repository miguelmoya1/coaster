package domain

import "time"

const EstablishmentTrial = 14 * 24 * time.Hour

const EstablishmentNameMinLength = 3

type Establishment struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt Time   `json:"createdAt"`
	UpdatedAt Time   `json:"updatedAt"`
}

type NewEstablishment struct {
	Name        string
	OwnerID     string
	Modules     []EstablishmentModule
	Language    string
	TrialEndsAt time.Time
}

type EstablishmentSettings struct {
	EstablishmentID string                `json:"establishmentId"`
	Modules         []EstablishmentModule `json:"modules"`
	Language        string                `json:"language"`
	MarkSoldOut     bool                  `json:"markSoldOut"`
	ConfiguredAt    *Time                 `json:"configuredAt"`
}

func DefaultEstablishmentSettings(establishmentID string) EstablishmentSettings {
	return EstablishmentSettings{
		EstablishmentID: establishmentID,
		Modules:         ResolveModules(DefaultEstablishmentModules),
		Language:        DefaultLanguage,
		MarkSoldOut:     false,
		ConfiguredAt:    nil,
	}
}

func (s EstablishmentSettings) Resolved() EstablishmentSettings {
	s.Modules = ResolveModules(s.Modules)
	s.Language = AsLanguage(s.Language)
	return s
}

type EstablishmentSettingsChanges struct {
	Modules     []EstablishmentModule
	Language    *string
	MarkSoldOut *bool
}
