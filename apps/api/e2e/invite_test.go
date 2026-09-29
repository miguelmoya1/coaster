package e2e

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

func TestInvitations(t *testing.T) {
	const (
		email    = "invitada@coaster.test"
		password = "una-contrasena-buena"
		token    = "una-invitacion-de-prueba"
	)

	invited := func(t *testing.T, existingPassword string, expiresIn time.Duration) string {
		resetDatabase(t)
		hash := ""
		if existingPassword != "" {
			var err error
			if hash, err = service.HashPassword(existingPassword); err != nil {
				t.Fatal(err)
			}
		}
		userID := newID()
		mustExec(t, `INSERT INTO "User" (id, email, name, "passwordHash", "updatedAt") VALUES ($1, $2, 'Invitada', nullif($3, ''), CURRENT_TIMESTAMP)`,
			userID, email, hash)
		mustExec(t, `INSERT INTO "AuthToken" (id, "userId", purpose, "tokenHash", "expiresAt")
			VALUES ($1, $2, 'INVITE', $3, CURRENT_TIMESTAMP + make_interval(secs => $4))`,
			newID(), userID, domain.HashAuthToken(token), expiresIn.Seconds())
		return userID
	}

	claim := func(t *testing.T, api *app, password string) *response {
		return api.post(t, "/auth/invite", map[string]any{"token": token, "password": password}, anonymous())
	}

	t.Run("tells the page who the invitation is for", func(t *testing.T) {
		api := newApp(t)
		invited(t, "", time.Minute)

		body := api.get(t, "/auth/invite/"+token, anonymous()).expect(t, http.StatusOK).object(t)

		expectExactly(t, "invite", body, map[string]any{"email": email, "name": "Invitada", "hasCredentials": false})
	})

	t.Run("says when the invited person can already sign in", func(t *testing.T) {
		api := newApp(t)
		invited(t, password, time.Minute)

		if body := api.get(t, "/auth/invite/"+token, anonymous()).expect(t, http.StatusOK).object(t); body["hasCredentials"] != true {
			t.Errorf("hasCredentials = %v, want true", body["hasCredentials"])
		}
	})

	t.Run("refuses an invitation nobody issued", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		api.get(t, "/auth/invite/una-invencion", anonymous()).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses an invitation past its date", func(t *testing.T) {
		api := newApp(t)
		invited(t, "", -time.Second)

		api.get(t, "/auth/invite/"+token, anonymous()).expect(t, http.StatusBadRequest)
	})

	t.Run("claims the account with a password and signs the person in", func(t *testing.T) {
		api := newApp(t)
		userID := invited(t, "", time.Minute)

		body := claim(t, api, password).expect(t, http.StatusOK).object(t)

		if id := body["user"].(map[string]any)["id"]; id != userID {
			t.Errorf("user = %v, want %s", id, userID)
		}
		hash := queryValue[string](t, `SELECT "passwordHash" FROM "User" WHERE id = $1`, userID)
		verified := queryValue[bool](t, `SELECT "emailVerifiedAt" IS NOT NULL FROM "User" WHERE id = $1`, userID)
		if !strings.HasPrefix(hash, "$argon2id$") || !verified {
			t.Errorf("hash %q, verified %v, want an argon2id hash and a confirmed address", hash, verified)
		}
	})

	t.Run("lets the person sign in afterwards with the password they chose", func(t *testing.T) {
		api := newApp(t)
		invited(t, "", time.Minute)

		claim(t, api, password).expect(t, http.StatusOK)
		api.post(t, "/auth/login", map[string]any{"email": email, "password": password}, anonymous()).expect(t, http.StatusOK)
	})

	t.Run("refuses to claim the same invitation twice", func(t *testing.T) {
		api := newApp(t)
		invited(t, "", time.Minute)

		claim(t, api, password).expect(t, http.StatusOK)
		claim(t, api, "otra-distinta").expect(t, http.StatusBadRequest)
	})

	t.Run("refuses to overwrite the password of somebody who had one", func(t *testing.T) {
		api := newApp(t)
		invited(t, "la-suya-de-siempre", time.Minute)

		claim(t, api, password).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses a password shorter than eight characters", func(t *testing.T) {
		api := newApp(t)
		invited(t, "", time.Minute)

		claim(t, api, "corta").expect(t, http.StatusBadRequest)
	})
}
