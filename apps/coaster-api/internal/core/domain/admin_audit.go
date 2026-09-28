package domain

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

type AdminAuditEntry struct {
	ActorID     string
	Action      string
	TargetType  string
	TargetID    string
	TargetLabel *string
	Reason      *string
	Metadata    any
}

type AdminAction struct {
	Entry AdminAuditEntry
}

func (AdminAction) Name() string { return "AdminActionEvent" }
