package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestIsInvitePending(t *testing.T) {
	changed := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name              string
		passwordUpdatedAt *time.Time
		identities        int
		want              bool
	}{
		{"never signed in", nil, 0, true},
		{"set a password", &changed, 0, false},
		{"signed in with Google", nil, 1, false},
		{"both", &changed, 2, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsInvitePending(tt.passwordUpdatedAt, tt.identities); got != tt.want {
				t.Errorf("IsInvitePending = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestInvitedUserName(t *testing.T) {
	tests := map[string]string{
		"ana@example.com":  "ana",
		"ana.b@a@b.com":    "ana.b",
		"sin-arroba":       "sin-arroba",
		"@example.com":     "",
		"Pepe@Example.COM": "Pepe",
	}

	for email, want := range tests {
		if got := InvitedUserName(email); got != want {
			t.Errorf("InvitedUserName(%q) = %q, want %q", email, got, want)
		}
	}
}

func TestEstablishmentMemberJSON(t *testing.T) {
	member := EstablishmentMember{
		ID: "m1", UserID: "u1", EstablishmentID: "e1", Role: EstablishmentRoleStaff, Active: true, Pending: true,
		UserName: "Ana", UserImage: "", UserEmail: "ana@example.com", StandIn: true,
	}

	raw, err := json.Marshal(member)
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"m1","userId":"u1","establishmentId":"e1","role":"STAFF","active":true,"pending":true,"userName":"Ana","userImage":"","userEmail":"ana@example.com"}`
	if string(raw) != want {
		t.Errorf("json = %s\nwant %s", raw, want)
	}
}

func TestAdminStandInMember(t *testing.T) {
	photo := "https://example.com/admin.png"
	admin := User{ID: "admin-1", Email: "admin@example.com", Name: "Admin", PhotoURL: &photo, Role: RoleAdmin}

	got := AdminStandInMember("e1", admin)
	want := EstablishmentMember{
		ID: AdminStandInMemberID, UserID: "admin-1", EstablishmentID: "e1", Role: EstablishmentRoleOwner, Active: true,
		UserName: "Admin", UserImage: photo, UserEmail: "admin@example.com", StandIn: true,
	}
	if got != want {
		t.Errorf("stand-in = %+v\nwant %+v", got, want)
	}

	admin.PhotoURL = nil
	if got := AdminStandInMember("e1", admin); got.UserImage != "" {
		t.Errorf("without a photo userImage = %q", got.UserImage)
	}
}
