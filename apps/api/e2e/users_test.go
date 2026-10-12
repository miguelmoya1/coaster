package e2e

import (
	"net/http"
	"testing"
)

func TestUsers(t *testing.T) {
	t.Run("returns the profile of the caller", func(t *testing.T) {
		api := newApp(t)
		resetWithMockUser(t)

		profile := api.get(t, "/users/me").expect(t, http.StatusOK).object(t)

		if profile["id"] != mockUser.id || profile["email"] != mockUser.email || profile["name"] != mockUser.name {
			t.Errorf("profile = %v, want %v", profile, mockUser)
		}
	})

	t.Run("updates the profile of the caller", func(t *testing.T) {
		api := newApp(t)
		resetWithMockUser(t)

		api.patch(t, "/users/me", map[string]any{"name": "Updated Name"}).expect(t, http.StatusOK)

		if name := queryValue[string](t, `SELECT name FROM "User" WHERE id = $1`, mockUser.id); name != "Updated Name" {
			t.Errorf("name = %q, want Updated Name", name)
		}
	})
}
