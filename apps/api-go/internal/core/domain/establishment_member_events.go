package domain

// The events of establishment-members/events/impl. Name() is the class name in Nest.

// MemberInvited is published after an invitation is saved (MemberInvitedEvent).
// InviterName is the name of the invited user, as Nest fills it.
type MemberInvited struct {
	EstablishmentID   string
	MemberID          string
	Email             string
	EstablishmentName string
	InviterName       string
	InviterLanguage   string
	UserID            string
}

func (MemberInvited) Name() string { return "MemberInvitedEvent" }

// MemberRemoved is published after a member is removed (MemberRemovedEvent).
type MemberRemoved struct {
	EstablishmentID string
	MemberID        string
	UserID          string
}

func (MemberRemoved) Name() string { return "MemberRemovedEvent" }

// MemberRoleChanged is published after a member's role changes (MemberRoleChangedEvent).
// ActorRole is the platform role of whoever changed it.
type MemberRoleChanged struct {
	EstablishmentID string
	MemberID        string
	UserID          string
	From            EstablishmentRole
	To              EstablishmentRole
	ActorID         string
	ActorRole       Role
}

func (MemberRoleChanged) Name() string { return "MemberRoleChangedEvent" }

// MemberRoleChangedAudit is the metadata of the AdminAuditLog row when a platform admin
// changes a member's role, with Nest's field names and order.
type MemberRoleChangedAudit struct {
	MemberID string            `json:"memberId"`
	UserID   string            `json:"userId"`
	From     EstablishmentRole `json:"from"`
	To       EstablishmentRole `json:"to"`
}
