package domain

type TimeEntryRecorded struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          *string
}

func (TimeEntryRecorded) Name() string { return "TimeEntryRecordedEvent" }

type TimeEntryAmended struct {
	EstablishmentID    string
	Entry              TimeEntry
	PreviousOccurredAt string
	ActorID            string
	ActorRole          Role
	Reason             string
}

func (TimeEntryAmended) Name() string { return "TimeEntryAmendedEvent" }

type TimeEntryVoided struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          string
}

func (TimeEntryVoided) Name() string { return "TimeEntryVoidedEvent" }

const (
	AuditTimeEntryCreated = "TIME_ENTRY_CREATED"
	AuditTimeEntryAmended = "TIME_ENTRY_AMENDED"
	AuditTimeEntryVoided  = "TIME_ENTRY_VOIDED"
	AuditTargetTimeEntry  = "TIME_ENTRY"
)

type TimeEntryAudit struct {
	ActorID     string
	Action      string
	TargetID    string
	TargetLabel string
	Reason      *string
	Metadata    TimeEntryAuditMetadata
}

type TimeEntryAuditMetadata struct {
	EstablishmentID    string        `json:"establishmentId"`
	UserID             string        `json:"userId"`
	Type               TimeEntryType `json:"type"`
	OccurredAt         Time          `json:"occurredAt"`
	PreviousOccurredAt *string       `json:"previousOccurredAt"`
}
