package e2e

import (
	"net/http"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/service"
)

func TestAccountRecovery(t *testing.T) {
	const (
		email       = "olvidadiza@coaster.test"
		oldPassword = "la-contrasena-vieja"
		newPassword = "la-contrasena-nueva"
	)

	seedAccount := func(t *testing.T, verified bool) {
		resetDatabase(t)
		hash, err := service.HashPassword(oldPassword)
		if err != nil {
			t.Fatal(err)
		}
		mustExec(t, `INSERT INTO "User" (id, email, name, "passwordHash", "emailVerifiedAt", "updatedAt")
			VALUES ($1, $2, 'Olvidadiza', $3, CASE WHEN $4 THEN CURRENT_TIMESTAMP END, CURRENT_TIMESTAMP)`,
			mockUser.id, email, hash, verified)
	}

	forgot := func(t *testing.T, api *app, address string) *response {
		return api.post(t, "/auth/forgot-password", map[string]any{"email": address}, anonymous())
	}

	login := func(t *testing.T, api *app, password string) *response {
		return api.post(t, "/auth/login", map[string]any{"email": email, "password": password}, anonymous())
	}

	reset := func(t *testing.T, api *app, token, password string) *response {
		return api.post(t, "/auth/reset-password", map[string]any{"token": token, "password": password}, anonymous())
	}

	resetToken := func(t *testing.T, api *app) string {
		forgot(t, api, email).expect(t, http.StatusNoContent)
		return api.mailbox.waitFor(t, "resetPassword", email).Token
	}

	t.Run("answers the same to an address with an account and one without", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		forgot(t, api, email).expect(t, http.StatusNoContent)
		forgot(t, api, "nadie@coaster.test").expect(t, http.StatusNoContent)
		api.mailbox.waitFor(t, "resetPassword", email)
		time.Sleep(200 * time.Millisecond)

		if sent := api.mailbox.count("resetPassword"); sent != 1 {
			t.Errorf("reset emails = %d, want 1", sent)
		}
	})

	t.Run("carries the whole way: link, new password, signed in, warned, old sessions closed", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)
		seedDevice(t, mockUser.id, device{familyID: "family-1"})

		response := reset(t, api, resetToken(t, api), newPassword).expect(t, http.StatusOK)

		if address := response.object(t)["user"].(map[string]any)["email"]; address != email {
			t.Errorf("user = %v, want %s", address, email)
		}
		response.cookie(t, sessionCookie)
		api.mailbox.waitFor(t, "passwordChanged", email)
		login(t, api, newPassword).expect(t, http.StatusOK)
		login(t, api, oldPassword).expect(t, http.StatusUnauthorized)
		closed := queryValue[[]bool](t, `SELECT array_agg("revokedAt" IS NOT NULL) FROM "AuthSession" WHERE "familyId" = 'family-1'`)
		if slices.Contains(closed, false) {
			t.Errorf("old sessions revoked = %v, want all", closed)
		}
	})

	t.Run("refuses to spend the same link twice", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)
		token := resetToken(t, api)

		reset(t, api, token, newPassword).expect(t, http.StatusOK)
		reset(t, api, token, "otra-mas").expect(t, http.StatusBadRequest)
	})

	t.Run("names the address the link belongs to", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		body := api.get(t, "/auth/reset-password/"+resetToken(t, api), anonymous()).expect(t, http.StatusOK).object(t)

		expectExactly(t, "reset link", body, map[string]any{"email": email})
	})

	t.Run("names nothing for a link nobody issued", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		api.get(t, "/auth/reset-password/un-token-inventado", anonymous()).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses a link nobody issued", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		reset(t, api, "un-token-inventado", newPassword).expect(t, http.StatusBadRequest)
	})

	t.Run("sends a confirmation that leaves the address confirmed", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)

		api.post(t, "/account/verify-email", nil).expect(t, http.StatusNoContent)
		token := api.mailbox.waitFor(t, "verifyEmail", email).Token
		api.post(t, "/auth/verify-email", map[string]any{"token": token}, anonymous()).expect(t, http.StatusNoContent)

		if verified := queryValue[bool](t, `SELECT "emailVerifiedAt" IS NOT NULL FROM "User" WHERE email = $1`, email); !verified {
			t.Error("the address is not confirmed")
		}
	})

	t.Run("sends nothing to somebody who confirmed already", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		api.post(t, "/account/verify-email", nil).expect(t, http.StatusNoContent)

		api.mailbox.expectNone(t, "verifyEmail")
	})

	t.Run("refuses a confirmation link that was already used", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)

		api.post(t, "/account/verify-email", nil).expect(t, http.StatusNoContent)
		token := api.mailbox.waitFor(t, "verifyEmail", email).Token
		api.post(t, "/auth/verify-email", map[string]any{"token": token}, anonymous()).expect(t, http.StatusNoContent)
		api.post(t, "/auth/verify-email", map[string]any{"token": token}, anonymous()).expect(t, http.StatusBadRequest)
	})

}
