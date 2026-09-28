package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// EstablishmentMemberRepository keeps who works in each establishment. Removed members keep
// their row with "deletedAt"; the finders leave them out and return nil with a nil error
// when there is nothing.
type EstablishmentMemberRepository interface {
	// ListActive lists the active members of the establishment.
	ListActive(ctx context.Context, establishmentID string) ([]domain.EstablishmentMember, error)
	// FindByUser returns the user's membership of the establishment, active or not.
	FindByUser(ctx context.Context, establishmentID, userID string) (*domain.EstablishmentMember, error)
	// FindInvite returns what resending the member's invitation needs.
	FindInvite(ctx context.Context, establishmentID, memberID string) (*domain.MemberInvite, error)
	// HasMemberWithEmail reports whether a member of the establishment has exactly this email.
	HasMemberWithEmail(ctx context.Context, establishmentID, email string) (bool, error)
	// Invite creates the user of the email, if there is none, and creates the
	// membership, or brings it back if it was removed, in one transaction.
	Invite(ctx context.Context, invitation domain.MemberInvitation) (*domain.InvitedMember, error)
	// UpdateRole returns false when the establishment has no such member.
	UpdateRole(ctx context.Context, establishmentID, memberID string, role domain.EstablishmentRole) (bool, error)
	// Remove marks the member removed. It returns false when the establishment has no member
	// with that id, removed or not.
	Remove(ctx context.Context, establishmentID, memberID string) (bool, error)
	// EstablishmentName returns nil when the establishment does not exist.
	EstablishmentName(ctx context.Context, establishmentID string) (*string, error)
}
