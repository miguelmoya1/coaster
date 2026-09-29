package domain

type MemberInvitedEvent struct {
	EstablishmentID   string
	MemberID          string
	Email             string
	EstablishmentName string
	InviterName       string
	InviterLanguage   string
	UserID            string
}

type MemberRemovedEvent struct {
	EstablishmentID string
	MemberID        string
	UserID          string
}

type MemberRoleChangedEvent struct {
	EstablishmentID string
	MemberID        string
	UserID          string
	From            EstablishmentRole
	To              EstablishmentRole
	ActorID         string
	ActorRole       Role
}

type MemberRoleChangedAudit struct {
	MemberID string            `json:"memberId"`
	UserID   string            `json:"userId"`
	From     EstablishmentRole `json:"from"`
	To       EstablishmentRole `json:"to"`
}
