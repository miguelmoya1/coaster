package domain

import (
	"strings"
	"time"
)

// EstablishmentMember is a member of an establishment as the API sends it
// (EstablishmentMember in @coaster/common).
type EstablishmentMember struct {
	ID              string            `json:"id"`
	UserID          string            `json:"userId"`
	EstablishmentID string            `json:"establishmentId"`
	Role            EstablishmentRole `json:"role"`
	Active          bool              `json:"active"`
	Pending         bool              `json:"pending"`
	UserName        string            `json:"userName"`
	UserImage       string            `json:"userImage"`
	UserEmail       string            `json:"userEmail"`
	// StandIn marks the made-up owner GET members/me answers a platform admin who is not a
	// member (AdminStandInMember).
	StandIn bool `json:"-"`
}

// AdminStandInMemberID is the id of the made-up membership of AdminStandInMember.
const AdminStandInMemberID = "mock-admin-member"

// AdminStandInMember is what GET members/me answers a platform admin who is not an active
// member: an owner made up from their profile.
func AdminStandInMember(establishmentID string, admin User) EstablishmentMember {
	image := ""
	if admin.PhotoURL != nil {
		image = *admin.PhotoURL
	}

	return EstablishmentMember{
		ID:              AdminStandInMemberID,
		UserID:          admin.ID,
		EstablishmentID: establishmentID,
		Role:            EstablishmentRoleOwner,
		Active:          true,
		Pending:         false,
		UserName:        admin.Name,
		UserImage:       image,
		UserEmail:       admin.Email,
		StandIn:         true,
	}
}

// IsInvitePending is isInvitePending of the Nest mapper: the invited person has not set a
// password nor signed in with Google yet.
func IsInvitePending(passwordUpdatedAt *time.Time, identities int) bool {
	return passwordUpdatedAt == nil && identities == 0
}

// InvitedUserName is the name an invitation gives the user: what comes before the @.
func InvitedUserName(email string) string {
	name, _, _ := strings.Cut(email, "@")
	return name
}

// MemberInvitation is an invitation to save: the user by email and their membership.
// Role is nil to leave the role as it is (STAFF for a new member).
type MemberInvitation struct {
	EstablishmentID string
	Email           string
	UserName        string
	Role            *EstablishmentRole
}

// InvitedMember is the membership an invitation left, with what its email needs.
type InvitedMember struct {
	ID                string
	UserID            string
	UserEmail         string
	UserName          string
	EstablishmentName string
}

// MemberInvite is what resending an invitation needs to know about a member.
type MemberInvite struct {
	ID                string
	UserID            string
	UserEmail         string
	UserActive        bool
	Pending           bool
	EstablishmentName string
}
