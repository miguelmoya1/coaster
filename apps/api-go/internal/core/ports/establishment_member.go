package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type EstablishmentMemberRepository interface {
	ListActive(ctx context.Context, establishmentID string) ([]domain.EstablishmentMember, error)

	FindByUser(ctx context.Context, establishmentID, userID string) (*domain.EstablishmentMember, error)

	FindInvite(ctx context.Context, establishmentID, memberID string) (*domain.MemberInvite, error)

	HasMemberWithEmail(ctx context.Context, establishmentID, email string) (bool, error)

	Invite(ctx context.Context, invitation domain.MemberInvitation) (*domain.InvitedMember, error)

	UpdateRole(ctx context.Context, establishmentID, memberID string, role domain.EstablishmentRole) (bool, error)

	Remove(ctx context.Context, establishmentID, memberID string) (bool, error)

	EstablishmentName(ctx context.Context, establishmentID string) (*string, error)
}
