package domain

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

type MemberRemoved struct {
	EstablishmentID string
	MemberID        string
	UserID          string
}

func (MemberRemoved) Name() string { return "MemberRemovedEvent" }

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

type MemberRoleChangedAudit struct {
	MemberID string            `json:"memberId"`
	UserID   string            `json:"userId"`
	From     EstablishmentRole `json:"from"`
	To       EstablishmentRole `json:"to"`
}
