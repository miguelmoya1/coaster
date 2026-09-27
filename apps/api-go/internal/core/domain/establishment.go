package domain

import "time"

// EstablishmentTrial is how long the trial of a new establishment lasts.
const EstablishmentTrial = 14 * 24 * time.Hour

// Establishment is Establishment in @coaster/common.
type Establishment struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt Time   `json:"createdAt"`
	UpdatedAt Time   `json:"updatedAt"`
}

// NewEstablishment is what creating an establishment writes: the establishment, its owner,
// a FREE subscription in trial until TrialEndsAt and its settings.
type NewEstablishment struct {
	Name        string
	OwnerID     string
	Modules     []EstablishmentModule
	Language    string
	TrialEndsAt time.Time
}

// EstablishmentSettings is EstablishmentSettings in @coaster/common. ConfiguredAt is nil
// until someone saves the settings for the first time.
type EstablishmentSettings struct {
	EstablishmentID string                `json:"establishmentId"`
	Modules         []EstablishmentModule `json:"modules"`
	Language        string                `json:"language"`
	MarkSoldOut     bool                  `json:"markSoldOut"`
	ConfiguredAt    *Time                 `json:"configuredAt"`
}

// DefaultEstablishmentSettings is what an establishment without a settings row runs.
func DefaultEstablishmentSettings(establishmentID string) EstablishmentSettings {
	return EstablishmentSettings{
		EstablishmentID: establishmentID,
		Modules:         ResolveModules(DefaultEstablishmentModules),
		Language:        DefaultLanguage,
		MarkSoldOut:     false,
		ConfiguredAt:    nil,
	}
}

// Resolved is EstablishmentSettingsMapper.toDto: the stored modules with the ones they bring
// along, and a language the app speaks.
func (s EstablishmentSettings) Resolved() EstablishmentSettings {
	s.Modules = ResolveModules(s.Modules)
	s.Language = AsLanguage(s.Language)
	return s
}

// EstablishmentSettingsChanges is what saving the settings writes. Modules replace the ones
// stored; a nil Language or MarkSoldOut stays as it is.
type EstablishmentSettingsChanges struct {
	Modules     []EstablishmentModule
	Language    *string
	MarkSoldOut *bool
}
