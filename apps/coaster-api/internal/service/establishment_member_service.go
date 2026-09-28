package service

import (
	"context"
	"log/slog"
	"strings"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

var EstablishmentMemberEvents = []string{
	domain.MemberInvited{}.Name(),
	domain.MemberRemoved{}.Name(),
	domain.MemberRoleChanged{}.Name(),
}

type EstablishmentMemberService struct {
	members  ports.EstablishmentMemberRepository
	security *SecurityService
	tokens   ports.AuthTokenRepository
	mailer   ports.Mailer
	cache    ports.Cache
	events   ports.EventPublisher
	realtime ports.Realtime
}

type EstablishmentMemberDependencies struct {
	Members  ports.EstablishmentMemberRepository
	Security *SecurityService
	Tokens   ports.AuthTokenRepository
	Mailer   ports.Mailer
	Cache    ports.Cache
	Events   ports.EventPublisher
	Realtime ports.Realtime
}

func NewEstablishmentMemberService(deps EstablishmentMemberDependencies) *EstablishmentMemberService {
	return &EstablishmentMemberService{
		members:  deps.Members,
		security: deps.Security,
		tokens:   deps.Tokens,
		mailer:   deps.Mailer,
		cache:    deps.Cache,
		events:   deps.Events,
		realtime: deps.Realtime,
	}
}

func (s *EstablishmentMemberService) Me(ctx context.Context, establishmentID string, caller domain.User) (domain.EstablishmentMember, error) {
	member, err := s.members.FindByUser(ctx, establishmentID, caller.ID)
	if err != nil {
		return domain.EstablishmentMember{}, err
	}

	if member != nil && member.Active {
		return *member, nil
	}

	if caller.Role == domain.RoleAdmin {
		return domain.AdminStandInMember(establishmentID, caller), nil
	}

	return domain.EstablishmentMember{}, domain.NotFound(domain.CodeMemberNotFound)
}

func (s *EstablishmentMemberService) List(ctx context.Context, establishmentID string) ([]domain.EstablishmentMember, error) {
	return s.members.ListActive(ctx, establishmentID)
}

func (s *EstablishmentMemberService) Invite(ctx context.Context, establishmentID string, inviter domain.User, email string, role *domain.EstablishmentRole) error {
	email = strings.ToLower(strings.TrimSpace(email))

	if role != nil && *role == domain.EstablishmentRoleOwner {
		allowed, err := s.canGrantOwner(ctx, establishmentID, inviter)
		if err != nil {
			return err
		}
		if !allowed {
			slog.Warn("a user tried to invite somebody as OWNER without being one",
				"userId", inviter.ID, "email", email, "establishmentId", establishmentID)
			return domain.Forbidden(domain.CodeCannotGrantOwnerRole)
		}
	}

	alreadyMember, err := s.members.HasMemberWithEmail(ctx, establishmentID, email)
	if err != nil {
		return err
	}
	if alreadyMember {
		return domain.Conflict(domain.CodeUserAlreadyMember)
	}

	invited, err := s.members.Invite(ctx, domain.MemberInvitation{
		EstablishmentID: establishmentID,
		Email:           email,
		UserName:        domain.InvitedUserName(email),
		Role:            role,
	})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.MemberInvited{
		EstablishmentID:   establishmentID,
		MemberID:          invited.ID,
		Email:             invited.UserEmail,
		EstablishmentName: invited.EstablishmentName,
		InviterName:       inviter.Name,
		InviterLanguage:   inviter.Language,
		UserID:            invited.UserID,
	})

	return nil
}

func (s *EstablishmentMemberService) canGrantOwner(ctx context.Context, establishmentID string, user domain.User) (bool, error) {
	if user.Role == domain.RoleAdmin {
		return true, nil
	}

	membership, err := s.security.Membership(ctx, user.ID, establishmentID)
	if err != nil {
		return false, err
	}

	return membership != nil && membership.Active && membership.Role == string(domain.EstablishmentRoleOwner), nil
}

func (s *EstablishmentMemberService) ResendInvite(ctx context.Context, establishmentID, memberID string, inviter domain.User) error {
	member, err := s.members.FindInvite(ctx, establishmentID, memberID)
	if err != nil {
		return err
	}
	if member == nil || !member.Active || !member.UserActive {
		return domain.NotFound(domain.CodeMemberNotFound)
	}
	if !member.Pending {
		return domain.Conflict(domain.CodeInviteAlreadyAccepted)
	}

	token, err := s.tokens.Issue(ctx, member.UserID, domain.AuthTokenInvite)
	if err != nil {
		return err
	}

	invite := domain.InviteEmail{EstablishmentName: member.EstablishmentName, InviterName: inviter.Name, Token: token}
	if err := s.mailer.SendInvite(ctx, member.UserEmail, invite, inviter.Language); err != nil {
		slog.Error("the invitation did not leave again",
			"email", member.UserEmail, "establishment", member.EstablishmentName, "error", err)
		return domain.ServiceUnavailable(domain.CodeInviteEmailFailed)
	}

	return nil
}

func (s *EstablishmentMemberService) UpdateRole(ctx context.Context, establishmentID, memberID string, role domain.EstablishmentRole, actor domain.User) error {
	members, err := s.members.ListActive(ctx, establishmentID)
	if err != nil {
		return err
	}

	member := memberWithID(members, memberID)
	if member == nil {
		return domain.NotFound(domain.CodeMemberNotFound)
	}

	if member.Role == role {
		return nil
	}

	if member.Role == domain.EstablishmentRoleOwner && ownersAmong(members) <= 1 {
		return domain.BadRequest(domain.CodeCannotRemoveLastOwner)
	}

	updated, err := s.members.UpdateRole(ctx, establishmentID, memberID, role)
	if err != nil {
		return err
	}
	if !updated {
		return domain.NotFound(domain.CodeMemberNotFound)
	}

	s.events.Publish(ctx, domain.MemberRoleChanged{
		EstablishmentID: establishmentID,
		MemberID:        memberID,
		UserID:          member.UserID,
		From:            member.Role,
		To:              role,
		ActorID:         actor.ID,
		ActorRole:       actor.Role,
	})

	return nil
}

func (s *EstablishmentMemberService) Remove(ctx context.Context, establishmentID, memberID string) error {
	members, err := s.members.ListActive(ctx, establishmentID)
	if err != nil {
		return err
	}

	member := memberWithID(members, memberID)
	if member == nil {
		slog.Warn("member not found or not belonging to establishment", "establishmentId", establishmentID, "memberId", memberID)
		return domain.BadRequest(domain.CodeMemberNotFound)
	}

	if member.Role == domain.EstablishmentRoleOwner && ownersAmong(members) <= 1 {
		return domain.BadRequest(domain.CodeCannotRemoveLastOwner)
	}

	removed, err := s.members.Remove(ctx, establishmentID, memberID)
	if err != nil {
		return err
	}
	if !removed {
		slog.Warn("member not found or not belonging to establishment", "establishmentId", establishmentID, "memberId", memberID)
		return domain.BadRequest(domain.CodeMemberNotFound)
	}

	s.events.Publish(ctx, domain.MemberRemoved{EstablishmentID: establishmentID, MemberID: memberID, UserID: member.UserID})

	return nil
}

func memberWithID(members []domain.EstablishmentMember, memberID string) *domain.EstablishmentMember {
	for i := range members {
		if members[i].ID == memberID {
			return &members[i]
		}
	}
	return nil
}

func ownersAmong(members []domain.EstablishmentMember) int {
	owners := 0
	for _, member := range members {
		if member.Role == domain.EstablishmentRoleOwner {
			owners++
		}
	}
	return owners
}

func (s *EstablishmentMemberService) ForgetCache(ctx context.Context, event ports.Event) {
	switch e := event.(type) {
	case domain.MemberInvited:
		s.cache.Forget(ctx, membershipCacheKey(e.EstablishmentID, e.UserID))
	case domain.MemberRemoved:
		s.cache.Forget(ctx, membershipCacheKey(e.EstablishmentID, e.UserID))
	case domain.MemberRoleChanged:
		s.cache.Forget(ctx, membershipCacheKey(e.EstablishmentID, e.UserID))
	}
}

func (s *EstablishmentMemberService) SendInvitation(ctx context.Context, event ports.Event) {
	invited, ok := event.(domain.MemberInvited)
	if !ok {
		return
	}

	if err := s.sendInvitation(ctx, invited); err != nil {
		slog.Error("the invitation never left",
			"email", invited.Email, "establishment", invited.EstablishmentName, "error", err)
	}
}

func (s *EstablishmentMemberService) sendInvitation(ctx context.Context, invited domain.MemberInvited) error {
	token, err := s.tokens.Issue(ctx, invited.UserID, domain.AuthTokenInvite)
	if err != nil {
		return err
	}

	invite := domain.InviteEmail{EstablishmentName: invited.EstablishmentName, InviterName: invited.InviterName, Token: token}

	return s.mailer.SendInvite(ctx, invited.Email, invite, invited.InviterLanguage)
}

type memberIDPayload struct {
	ID string `json:"id"`
}

type memberRoleChangedPayload struct {
	ID     string                   `json:"id"`
	UserID string                   `json:"userId"`
	Role   domain.EstablishmentRole `json:"role"`
}

func (s *EstablishmentMemberService) PublishRealtime(_ context.Context, event ports.Event) {
	switch e := event.(type) {
	case domain.MemberInvited:
		s.realtime.Publish(e.EstablishmentID, domain.RealtimeMemberInvited, memberIDPayload{ID: e.MemberID})
	case domain.MemberRemoved:
		s.realtime.Publish(e.EstablishmentID, domain.RealtimeMemberRemoved, memberIDPayload{ID: e.MemberID})
		s.realtime.Revoke(e.EstablishmentID, e.UserID)
	case domain.MemberRoleChanged:
		s.realtime.Publish(e.EstablishmentID, domain.RealtimeMemberRoleChanged,
			memberRoleChangedPayload{ID: e.MemberID, UserID: e.UserID, Role: e.To})
	}
}

func (s *EstablishmentMemberService) AuditRoleChange(ctx context.Context, event ports.Event) {
	changed, ok := event.(domain.MemberRoleChanged)
	if !ok || changed.ActorRole != domain.RoleAdmin {
		return
	}

	name, err := s.members.EstablishmentName(ctx, changed.EstablishmentID)
	if err != nil {
		slog.Error("could not audit a member's role change", "establishmentId", changed.EstablishmentID, "error", err)
		return
	}

	s.events.Publish(ctx, domain.AdminAction{Entry: domain.AdminAuditEntry{
		ActorID:     changed.ActorID,
		Action:      domain.AuditEstablishmentMemberRoleChanged,
		TargetType:  domain.AuditTargetEstablishment,
		TargetID:    changed.EstablishmentID,
		TargetLabel: name,
		Metadata: domain.MemberRoleChangedAudit{
			MemberID: changed.MemberID,
			UserID:   changed.UserID,
			From:     changed.From,
			To:       changed.To,
		},
	}})
}
