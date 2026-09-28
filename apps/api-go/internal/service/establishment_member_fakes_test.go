package service

import (
	"context"
	"errors"
	"sync"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type fakeMemberRow struct {
	member  domain.EstablishmentMember
	removed bool
}

type fakeMemberRepository struct {
	rows           []*fakeMemberRow
	invites        map[string]*domain.MemberInvite
	establishments map[string]string
	invitations    []domain.MemberInvitation
	updatedRoles   []string
	removedIDs     []string
	fail           bool
}

func newFakeMemberRepository() *fakeMemberRepository {
	return &fakeMemberRepository{
		invites:        make(map[string]*domain.MemberInvite),
		establishments: map[string]string{"e1": "Bar Pepe"},
	}
}

func (f *fakeMemberRepository) add(member domain.EstablishmentMember) {
	member.Active = true
	f.rows = append(f.rows, &fakeMemberRow{member: member})
}

func (f *fakeMemberRepository) ListActive(_ context.Context, establishmentID string) ([]domain.EstablishmentMember, error) {
	if f.fail {
		return nil, errDatabaseDown
	}

	members := []domain.EstablishmentMember{}
	for _, row := range f.rows {
		if row.member.EstablishmentID == establishmentID && row.member.Active && !row.removed {
			members = append(members, row.member)
		}
	}
	return members, nil
}

func (f *fakeMemberRepository) FindByUser(_ context.Context, establishmentID, userID string) (*domain.EstablishmentMember, error) {
	for _, row := range f.rows {
		if row.member.EstablishmentID == establishmentID && row.member.UserID == userID && !row.removed {
			member := row.member
			return &member, nil
		}
	}
	return nil, nil
}

func (f *fakeMemberRepository) FindInvite(_ context.Context, establishmentID, memberID string) (*domain.MemberInvite, error) {
	invite, ok := f.invites[memberID]
	if !ok || establishmentID != "e1" {
		return nil, nil
	}
	return invite, nil
}

func (f *fakeMemberRepository) HasMemberWithEmail(_ context.Context, establishmentID, email string) (bool, error) {
	for _, row := range f.rows {
		if row.member.EstablishmentID == establishmentID && row.member.UserEmail == email && !row.removed {
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeMemberRepository) Invite(_ context.Context, invitation domain.MemberInvitation) (*domain.InvitedMember, error) {
	if f.fail {
		return nil, errDatabaseDown
	}
	f.invitations = append(f.invitations, invitation)

	return &domain.InvitedMember{
		ID:                "member-" + invitation.Email,
		UserID:            "user-" + invitation.Email,
		UserEmail:         invitation.Email,
		UserName:          invitation.UserName,
		EstablishmentName: f.establishments[invitation.EstablishmentID],
	}, nil
}

func (f *fakeMemberRepository) UpdateRole(_ context.Context, establishmentID, memberID string, role domain.EstablishmentRole) (bool, error) {
	for _, row := range f.rows {
		if row.member.EstablishmentID == establishmentID && row.member.ID == memberID && !row.removed {
			row.member.Role = role
			f.updatedRoles = append(f.updatedRoles, memberID+"="+string(role))
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeMemberRepository) Remove(_ context.Context, establishmentID, memberID string) (bool, error) {
	for _, row := range f.rows {
		if row.member.EstablishmentID == establishmentID && row.member.ID == memberID {
			row.removed = true
			f.removedIDs = append(f.removedIDs, memberID)
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeMemberRepository) EstablishmentName(_ context.Context, establishmentID string) (*string, error) {
	if f.fail {
		return nil, errDatabaseDown
	}
	name, ok := f.establishments[establishmentID]
	if !ok {
		return nil, nil
	}
	return &name, nil
}

type memberEventRecorder struct {
	mu     sync.Mutex
	events []ports.Event
}

func (r *memberEventRecorder) Publish(_ context.Context, event ports.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, event)
}

type memberRealtimeMessage struct {
	establishmentID string
	event           string
	payload         any
	revokedUserID   string
}

type memberRealtimeRecorder struct {
	messages []memberRealtimeMessage
}

func (r *memberRealtimeRecorder) Publish(establishmentID string, event string, payload any) {
	r.messages = append(r.messages, memberRealtimeMessage{establishmentID: establishmentID, event: event, payload: payload})
}

func (r *memberRealtimeRecorder) Revoke(establishmentID string, userID string) {
	r.messages = append(r.messages, memberRealtimeMessage{establishmentID: establishmentID, revokedUserID: userID})
}

type memberInviteEmail struct {
	to       string
	invite   domain.InviteEmail
	language string
}

type memberMailer struct {
	fakeMailer
	invites []memberInviteEmail
}

func (m *memberMailer) SendInvite(_ context.Context, to string, invite domain.InviteEmail, language string) error {
	if m.fail {
		return errors.New("resend refused it")
	}
	m.invites = append(m.invites, memberInviteEmail{to: to, invite: invite, language: language})
	return nil
}

type memberTokens struct {
	fakeTokens
	issuedFor []string
	fail      bool
}

func (t *memberTokens) Issue(_ context.Context, userID string, purpose domain.AuthTokenPurpose) (string, error) {
	if t.fail {
		return "", errDatabaseDown
	}
	t.issuedFor = append(t.issuedFor, userID+"/"+string(purpose))
	return "token-" + userID, nil
}
