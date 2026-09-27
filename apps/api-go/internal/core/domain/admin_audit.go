package domain

// The AdminAuditLog values of what a platform admin does (AdminAuditAction and
// AdminAuditTargetType in @coaster/common). The ones about punches are in
// time_entry_events.go.
const (
	AuditEstablishmentPlanGranted       = "ESTABLISHMENT_PLAN_GRANTED"
	AuditEstablishmentPlanRevoked       = "ESTABLISHMENT_PLAN_REVOKED"
	AuditEstablishmentRenamed           = "ESTABLISHMENT_RENAMED"
	AuditEstablishmentMemberRoleChanged = "ESTABLISHMENT_MEMBER_ROLE_CHANGED"
	AuditEstablishmentModulesChanged    = "ESTABLISHMENT_MODULES_CHANGED"
	AuditUserRoleChanged                = "USER_ROLE_CHANGED"
	AuditUserActivationChanged          = "USER_ACTIVATION_CHANGED"
	AuditBetaTesterAdded                = "BETA_TESTER_ADDED"
	AuditBetaTesterRemoved              = "BETA_TESTER_REMOVED"

	AuditTargetEstablishment = "ESTABLISHMENT"
	AuditTargetUser          = "USER"
	AuditTargetBetaTester    = "BETA_TESTER"
)

// AdminAuditEntry is RecordAuditEntry: a row of AdminAuditLog. Metadata is written as
// its JSON, so it has to be a struct with json tags (Nest's field names and order) or a
// map; nil leaves the column NULL.
type AdminAuditEntry struct {
	ActorID     string
	Action      string
	TargetType  string
	TargetID    string
	TargetLabel *string
	Reason      *string
	Metadata    any
}

// AdminAction is AdminActionEvent. Whoever does something a platform admin has to answer
// for publishes it after saving, and its subscriber writes the entry to AdminAuditLog.
type AdminAction struct {
	Entry AdminAuditEntry
}

func (AdminAction) Name() string { return "AdminActionEvent" }
