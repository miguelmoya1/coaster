package domain

type TimeEntryRecordedEvent struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          *string
}

type TimeEntryAmendedEvent struct {
	EstablishmentID    string
	Entry              TimeEntry
	PreviousOccurredAt string
	ActorID            string
	ActorRole          Role
	Reason             string
}

type TimeEntryVoidedEvent struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          string
}

const (
	AuditTimeEntryCreated = "TIME_ENTRY_CREATED"
	AuditTimeEntryAmended = "TIME_ENTRY_AMENDED"
	AuditTimeEntryVoided  = "TIME_ENTRY_VOIDED"
	AuditTargetTimeEntry  = "TIME_ENTRY"
)

type TimeEntryAuditMetadata struct {
	EstablishmentID    string        `json:"establishmentId"`
	UserID             string        `json:"userId"`
	Type               TimeEntryType `json:"type"`
	OccurredAt         Time          `json:"occurredAt"`
	PreviousOccurredAt *string       `json:"previousOccurredAt"`
}
