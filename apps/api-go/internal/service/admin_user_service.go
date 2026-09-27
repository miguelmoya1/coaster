package service

import (
	"context"
	"strings"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// adminRecentActivity is how many log entries a detail page of the backoffice shows.
const adminRecentActivity = 10

// AdminUserService is the users page of the backoffice: any user of the platform, their
// role and whether they may sign in.
type AdminUserService struct {
	users  ports.AdminUserRepository
	audit  ports.AdminAuditRepository
	events ports.EventPublisher
}

func NewAdminUserService(users ports.AdminUserRepository, audit ports.AdminAuditRepository, events ports.EventPublisher) *AdminUserService {
	return &AdminUserService{users: users, audit: audit, events: events}
}

// List is ListAdminUsersQuery: the users newest first, one page at a time. The search looks
// for the whole id, or for part of the name or the email.
func (s *AdminUserService) List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) (domain.Paginated[domain.AdminUserSummary], error) {
	filter.Search = strings.TrimSpace(filter.Search)

	users, total, err := s.users.List(ctx, filter, page)
	if err != nil {
		return domain.Paginated[domain.AdminUserSummary]{}, err
	}

	return domain.NewPage(users, total, page), nil
}

// Detail is GetAdminUserDetailQuery: the user, the establishments they belong to and the
// latest admin actions on them.
func (s *AdminUserService) Detail(ctx context.Context, userID string) (domain.AdminUserDetail, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return domain.AdminUserDetail{}, err
	}
	if user == nil {
		return domain.AdminUserDetail{}, domain.NotFound(domain.CodeUserNotFound)
	}

	memberships, err := s.users.Memberships(ctx, userID)
	if err != nil {
		return domain.AdminUserDetail{}, err
	}

	activity, err := s.audit.RecentFor(ctx, domain.AuditTargetUser, userID, adminRecentActivity)
	if err != nil {
		return domain.AdminUserDetail{}, err
	}

	return domain.AdminUserDetail{User: *user, Establishments: memberships, RecentActivity: activity}, nil
}

// adminRoleChange and adminActivationChange are the metadata of the audit entries of Update.
type adminRoleChange struct {
	From domain.Role `json:"from"`
	To   domain.Role `json:"to"`
}

type adminActivationChange struct {
	Active bool `json:"active"`
}

// Update is UpdateAdminUserCommand. An admin cannot change their own account, and the last
// active admin cannot lose the role or be switched off. Each change that happens gets its
// own entry in the log.
func (s *AdminUserService) Update(ctx context.Context, actorID, userID string, changes domain.AdminUserChanges) error {
	if userID == actorID {
		return domain.BadRequest(domain.CodeCannotEditOwnAdminAccount)
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return domain.NotFound(domain.CodeUserNotFound)
	}

	nextRole, nextActive := user.Role, user.Active
	if changes.Role != nil {
		nextRole = *changes.Role
	}
	if changes.Active != nil {
		nextActive = *changes.Active
	}

	losesAdmin := user.Role == domain.RoleAdmin && (nextRole != domain.RoleAdmin || !nextActive)
	if losesAdmin {
		admins, err := s.users.CountActiveAdmins(ctx)
		if err != nil {
			return err
		}
		if admins <= 1 {
			return domain.BadRequest(domain.CodeCannotDemoteLastAdmin)
		}
	}

	if nextRole == user.Role && nextActive == user.Active {
		return nil
	}

	if err := s.users.Update(ctx, userID, changes); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.UserUpdated{UserID: userID})

	if changes.Role != nil && *changes.Role != user.Role {
		s.events.Publish(ctx, domain.AdminAction{Entry: domain.AdminAuditEntry{
			ActorID:     actorID,
			Action:      domain.AuditUserRoleChanged,
			TargetType:  domain.AuditTargetUser,
			TargetID:    userID,
			TargetLabel: &user.Email,
			Metadata:    adminRoleChange{From: user.Role, To: *changes.Role},
		}})
	}

	if changes.Active != nil && *changes.Active != user.Active {
		s.events.Publish(ctx, domain.AdminAction{Entry: domain.AdminAuditEntry{
			ActorID:     actorID,
			Action:      domain.AuditUserActivationChanged,
			TargetType:  domain.AuditTargetUser,
			TargetID:    userID,
			TargetLabel: &user.Email,
			Metadata:    adminActivationChange{Active: *changes.Active},
		}})
	}

	return nil
}
