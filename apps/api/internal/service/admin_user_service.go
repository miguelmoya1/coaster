package service

import (
	"context"
	"strings"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

const adminRecentActivity = 10

type AdminUserService struct {
	users  ports.AdminUserRepository
	audit  ports.AdminAuditRepository
	events ports.EventPublisher
}

func NewAdminUserService(users ports.AdminUserRepository, audit ports.AdminAuditRepository, events ports.EventPublisher) *AdminUserService {
	return &AdminUserService{users: users, audit: audit, events: events}
}

func (s *AdminUserService) List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) (domain.Paginated[domain.AdminUserSummary], error) {
	filter.Search = strings.TrimSpace(filter.Search)

	users, total, err := s.users.List(ctx, filter, page)
	if err != nil {
		return domain.Paginated[domain.AdminUserSummary]{}, err
	}

	return domain.NewPage(users, total, page), nil
}

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

type adminRoleChange struct {
	From domain.Role `json:"from"`
	To   domain.Role `json:"to"`
}

type adminActivationChange struct {
	Active bool `json:"active"`
}

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

	if err := s.checkNotLastAdmin(ctx, user, nextRole, nextActive); err != nil {
		return err
	}

	if nextRole == user.Role && nextActive == user.Active {
		return nil
	}

	if err := s.users.Update(ctx, userID, changes); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.UserUpdatedEvent{UserID: userID})

	if changes.Role != nil && *changes.Role != user.Role {
		s.auditUser(ctx, actorID, user, domain.AuditUserRoleChanged, adminRoleChange{From: user.Role, To: *changes.Role})
	}
	if changes.Active != nil && *changes.Active != user.Active {
		s.auditUser(ctx, actorID, user, domain.AuditUserActivationChanged, adminActivationChange{Active: *changes.Active})
	}

	return nil
}

func (s *AdminUserService) checkNotLastAdmin(ctx context.Context, user *domain.AdminUserSummary, nextRole domain.Role, nextActive bool) error {
	losesAdmin := user.Role == domain.RoleAdmin && (nextRole != domain.RoleAdmin || !nextActive)
	if !losesAdmin {
		return nil
	}

	admins, err := s.users.CountActiveAdmins(ctx)
	if err != nil {
		return err
	}
	if admins <= 1 {
		return domain.BadRequest(domain.CodeCannotDemoteLastAdmin)
	}

	return nil
}

func (s *AdminUserService) auditUser(ctx context.Context, actorID string, user *domain.AdminUserSummary, action string, metadata any) {
	s.events.Publish(ctx, domain.AdminActionEvent{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      action,
		TargetType:  domain.AuditTargetUser,
		TargetID:    user.ID,
		TargetLabel: &user.Email,
		Metadata:    metadata,
	}})
}
