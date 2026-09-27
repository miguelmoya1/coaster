package domain

// TimeEntryRecorded is published after a punch is saved (TimeEntryRecordedEvent in Nest).
// ActorRole is the platform role of whoever made it.
type TimeEntryRecorded struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          *string
}

func (TimeEntryRecorded) Name() string { return "TimeEntryRecordedEvent" }

// TimeEntryAmended is published after a punch is corrected (TimeEntryAmendedEvent in Nest).
type TimeEntryAmended struct {
	EstablishmentID    string
	Entry              TimeEntry
	PreviousOccurredAt string
	ActorID            string
	ActorRole          Role
	Reason             string
}

func (TimeEntryAmended) Name() string { return "TimeEntryAmendedEvent" }

// TimeEntryVoided is published after a punch is cancelled (TimeEntryVoidedEvent in Nest).
type TimeEntryVoided struct {
	EstablishmentID string
	Entry           TimeEntry
	ActorID         string
	ActorRole       Role
	Reason          string
}

func (TimeEntryVoided) Name() string { return "TimeEntryVoidedEvent" }

// The AdminAuditLog values of a change to a punch (AdminAuditAction and
// AdminAuditTargetType in @coaster/common).
const (
	AuditTimeEntryCreated = "TIME_ENTRY_CREATED"
	AuditTimeEntryAmended = "TIME_ENTRY_AMENDED"
	AuditTimeEntryVoided  = "TIME_ENTRY_VOIDED"
	AuditTargetTimeEntry  = "TIME_ENTRY"
)

// TimeEntryAudit is a row of the backoffice log about a punch a platform admin touched.
type TimeEntryAudit struct {
	ActorID     string
	Action      string
	TargetID    string
	TargetLabel string
	Reason      *string
	Metadata    TimeEntryAuditMetadata
}

// TimeEntryAuditMetadata is the metadata column, with Nest's field names and order.
type TimeEntryAuditMetadata struct {
	EstablishmentID    string        `json:"establishmentId"`
	UserID             string        `json:"userId"`
	Type               TimeEntryType `json:"type"`
	OccurredAt         Time          `json:"occurredAt"`
	PreviousOccurredAt *string       `json:"previousOccurredAt"`
}
