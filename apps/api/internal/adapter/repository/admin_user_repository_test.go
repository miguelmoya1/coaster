package repository

import (
	"context"
	"reflect"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestAdminUserRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewAdminUserRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, daysBefore(3))
	insertAdminUser(t, "old-admin", "Olga", "olga@example.com", "ADMIN", false, daysBefore(2))
	insertAdminUser(t, "ana", "Ana García", "ana@bar.com", "USER", true, daysBefore(1))
	adminExec(t, `INSERT INTO "UserPreferences" (id, "userId", language, "updatedAt") VALUES ('p1', 'ana', 'en', now())`)

	insertAdminEstablishment(t, "e1", "Bar Pepe", daysBefore(10))
	insertAdminEstablishment(t, "e2", "Café Luna", daysBefore(10))
	insertAdminEstablishment(t, "e3", "Old bar", daysBefore(10))
	insertAdminMember(t, "m1", "e1", "ana", "OWNER", true, false, daysBefore(5))
	insertAdminMember(t, "m2", "e2", "ana", "STAFF", false, false, daysBefore(4))
	insertAdminMember(t, "m3", "e3", "ana", "STAFF", true, true, daysBefore(3))

	page := domain.PageRequest{Page: 1, PageSize: 20}

	all, total, err := users.List(ctx, domain.AdminUserFilter{}, page)
	if err != nil || total != 3 || len(all) != 3 || all[0].ID != "ana" || all[2].ID != "admin" {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}
	ana := all[0]
	if ana.Language != "en" || ana.EstablishmentCount != 1 || ana.Role != domain.RoleUser || ana.PhotoURL != nil {
		t.Errorf("ana = %+v", ana)
	}
	if all[2].Language != domain.DefaultLanguage || all[2].EstablishmentCount != 0 {
		t.Errorf("admin = %+v", all[2])
	}

	active := true
	inactive := false
	tests := []struct {
		name   string
		filter domain.AdminUserFilter
		want   []string
	}{
		{"by id", domain.AdminUserFilter{Search: "old-admin"}, []string{"old-admin"}},
		{"by part of the name", domain.AdminUserFilter{Search: "garcía"}, []string{"ana"}},
		{"by part of the email", domain.AdminUserFilter{Search: "EXAMPLE.COM"}, []string{"old-admin", "admin"}},
		{"by role", domain.AdminUserFilter{Role: domain.RoleAdmin}, []string{"old-admin", "admin"}},
		{"active admins", domain.AdminUserFilter{Role: domain.RoleAdmin, Active: &active}, []string{"admin"}},
		{"inactive", domain.AdminUserFilter{Active: &inactive}, []string{"old-admin"}},
	}
	for _, tt := range tests {
		found, total, err := users.List(ctx, tt.filter, page)
		var ids []string
		for _, user := range found {
			ids = append(ids, user.ID)
		}
		if err != nil || total != len(tt.want) || !slices.Equal(ids, tt.want) {
			t.Errorf("%s: List = %v, %d, %v", tt.name, ids, total, err)
		}
	}

	found, err := users.FindByID(ctx, "ana")
	if err != nil || found == nil || !reflect.DeepEqual(*found, ana) {
		t.Fatalf("FindByID = %+v, %v", found, err)
	}
	if missing, err := users.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID(nope) = %+v, %v", missing, err)
	}

	memberships, err := users.Memberships(ctx, "ana")
	if err != nil || len(memberships) != 2 {
		t.Fatalf("Memberships = %+v, %v", memberships, err)
	}
	if memberships[0].EstablishmentID != "e2" || memberships[0].EstablishmentName != "Café Luna" || memberships[0].Active ||
		memberships[1].EstablishmentID != "e1" || memberships[1].Role != domain.EstablishmentRoleOwner {
		t.Errorf("memberships = %+v", memberships)
	}

	if admins, err := users.CountActiveAdmins(ctx); err != nil || admins != 1 {
		t.Fatalf("CountActiveAdmins = %d, %v", admins, err)
	}

	admin := domain.RoleAdmin
	if err := users.Update(ctx, "ana", domain.AdminUserChanges{Role: &admin}); err != nil {
		t.Fatal(err)
	}
	if updated, _ := users.FindByID(ctx, "ana"); updated.Role != domain.RoleAdmin || !updated.Active {
		t.Errorf("after promoting = %+v", updated)
	}
	if err := users.Update(ctx, "ana", domain.AdminUserChanges{Active: &inactive}); err != nil {
		t.Fatal(err)
	}
	if updated, _ := users.FindByID(ctx, "ana"); updated.Role != domain.RoleAdmin || updated.Active {
		t.Errorf("after deactivating = %+v", updated)
	}
}
