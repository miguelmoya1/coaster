package domain

import (
	"strings"
	"time"
)

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

	StandIn bool `json:"-"`
}

const AdminStandInMemberID = "mock-admin-member"

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

func IsInvitePending(passwordUpdatedAt *time.Time, identities int) bool {
	return passwordUpdatedAt == nil && identities == 0
}

func InvitedUserName(email string) string {
	name, _, _ := strings.Cut(email, "@")
	return name
}

type MemberInvitation struct {
	EstablishmentID string
	Email           string
	UserName        string
	Role            *EstablishmentRole
}

type InvitedMember struct {
	ID                string
	UserID            string
	UserEmail         string
	UserName          string
	EstablishmentName string
}

type MemberInvite struct {
	ID                string
	UserID            string
	Active            bool
	UserEmail         string
	UserActive        bool
	Pending           bool
	EstablishmentName string
}
