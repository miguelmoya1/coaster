package service

import (
	"context"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

func newAdminUserFake(admins int) *adminUserFake {
	return &adminUserFake{
		admins: admins,
		users: map[string]domain.AdminUserSummary{
			"ana":   {ID: "ana", Email: "ana@bar.com", Role: domain.RoleUser, Active: true},
			"olga":  {ID: "olga", Email: "olga@example.com", Role: domain.RoleAdmin, Active: true},
			"admin": {ID: "admin", Email: "miguel@example.com", Role: domain.RoleAdmin, Active: true},
		},
	}
}

func TestAdminUserServiceUpdate(t *testing.T) {
	admin, user := domain.RoleAdmin, domain.RoleUser
	on, off := true, false

	tests := []struct {
		name      string
		admins    int
		userID    string
		changes   domain.AdminUserChanges
		wantErr   string
		wantKind  domain.ErrorKind
		wantAudit []string
	}{
		{name: "promote a user", admins: 2, userID: "ana", changes: domain.AdminUserChanges{Role: &admin},
			wantAudit: []string{domain.AuditUserRoleChanged}},
		{name: "deactivate a user", admins: 2, userID: "ana", changes: domain.AdminUserChanges{Active: &off},
			wantAudit: []string{domain.AuditUserActivationChanged}},
		{name: "demote and deactivate an admin", admins: 2, userID: "olga", changes: domain.AdminUserChanges{Role: &user, Active: &off},
			wantAudit: []string{domain.AuditUserRoleChanged, domain.AuditUserActivationChanged}},
		{name: "the same state again", admins: 2, userID: "ana", changes: domain.AdminUserChanges{Role: &user, Active: &on}},
		{name: "their own account", admins: 2, userID: "admin", changes: domain.AdminUserChanges{Active: &off},
			wantErr: domain.CodeCannotEditOwnAdminAccount, wantKind: domain.KindBadRequest},
		{name: "a user that does not exist", admins: 2, userID: "nope", changes: domain.AdminUserChanges{Role: &admin},
			wantErr: domain.CodeUserNotFound, wantKind: domain.KindNotFound},
		{name: "demote the last admin", admins: 1, userID: "olga", changes: domain.AdminUserChanges{Role: &user},
			wantErr: domain.CodeCannotDemoteLastAdmin, wantKind: domain.KindBadRequest},
		{name: "deactivate the last admin", admins: 1, userID: "olga", changes: domain.AdminUserChanges{Active: &off},
			wantErr: domain.CodeCannotDemoteLastAdmin, wantKind: domain.KindBadRequest},
		{name: "keep the last admin as they are", admins: 1, userID: "olga", changes: domain.AdminUserChanges{Role: &admin}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users := newAdminUserFake(tt.admins)
			events := &eventRecorder{}

			err := NewAdminUserService(users, &adminAuditFake{}, events).Update(context.Background(), "admin", tt.userID, tt.changes)

			if tt.wantErr != "" {
				if !isAdminError(err, tt.wantKind, tt.wantErr) {
					t.Fatalf("err = %v, want %s", err, tt.wantErr)
				}
				if len(users.updated) != 0 || len(events.events) != 0 {
					t.Fatalf("it wrote %+v and published %v", users.updated, events.names())
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if tt.wantAudit == nil {
				if len(users.updated) != 0 || len(events.events) != 0 {
					t.Fatalf("it wrote %+v and published %v", users.updated, events.names())
				}
				return
			}

			if len(users.updated) != 1 {
				t.Fatalf("updates = %+v", users.updated)
			}
			if updated, ok := events.events[0].(domain.UserUpdatedEvent); !ok || updated.UserID != tt.userID {
				t.Errorf("first event = %+v, want UserUpdatedEvent", events.events[0])
			}

			var actions []string
			for _, entry := range adminActionsIn(events.events) {
				actions = append(actions, entry.Action)
				if entry.ActorID != "admin" || entry.TargetType != domain.AuditTargetUser || entry.TargetID != tt.userID ||
					*entry.TargetLabel != users.users[tt.userID].Email {
					t.Errorf("entry = %+v", entry)
				}
			}
			if !slices.Equal(actions, tt.wantAudit) {
				t.Errorf("audited %v, want %v", actions, tt.wantAudit)
			}
		})
	}
}

func TestAdminUserServiceUpdateMetadata(t *testing.T) {
	users := newAdminUserFake(2)
	events := &eventRecorder{}
	admin, off := domain.RoleAdmin, false

	if err := NewAdminUserService(users, &adminAuditFake{}, events).Update(context.Background(), "admin", "ana",
		domain.AdminUserChanges{Role: &admin, Active: &off}); err != nil {
		t.Fatal(err)
	}

	entries := adminActionsIn(events.events)
	if len(entries) != 2 ||
		entries[0].Metadata != (adminRoleChange{From: domain.RoleUser, To: domain.RoleAdmin}) ||
		entries[1].Metadata != (adminActivationChange{Active: false}) {
		t.Errorf("entries = %+v", entries)
	}
}

func TestAdminUserServiceDetail(t *testing.T) {
	audit := &adminAuditFake{recent: make([]domain.AdminAuditLogEntry, 12)}
	service := NewAdminUserService(newAdminUserFake(2), audit, &eventRecorder{})

	detail, err := service.Detail(context.Background(), "ana")
	if err != nil || detail.User.ID != "ana" || len(detail.Establishments) != 1 || len(detail.RecentActivity) != 10 {
		t.Fatalf("Detail = %+v, %v", detail, err)
	}
	if !slices.Equal(audit.asked, []string{"USER:ana"}) {
		t.Errorf("asked the log for %v", audit.asked)
	}

	if _, err := service.Detail(context.Background(), "nope"); !isAdminError(err, domain.KindNotFound, domain.CodeUserNotFound) {
		t.Fatalf("Detail(nope) = %v", err)
	}
}
