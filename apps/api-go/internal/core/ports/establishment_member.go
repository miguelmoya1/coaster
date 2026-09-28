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

type EstablishmentMemberService interface {
	Me(ctx context.Context, establishmentID string, caller domain.User) (domain.EstablishmentMember, error)
	List(ctx context.Context, establishmentID string) ([]domain.EstablishmentMember, error)
	Invite(ctx context.Context, establishmentID string, inviter domain.User, email string, role *domain.EstablishmentRole) error
	ResendInvite(ctx context.Context, establishmentID, memberID string, inviter domain.User) error
	UpdateRole(ctx context.Context, establishmentID, memberID string, role domain.EstablishmentRole, actor domain.User) error
	Remove(ctx context.Context, establishmentID, memberID string) error
}
