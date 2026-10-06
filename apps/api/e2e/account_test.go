package e2e

import (
	"net/http"
	"slices"
	"strings"
	"testing"

	"coaster-api/internal/service"
)

type device struct {
	id        string
	familyID  string
	userAgent string
	ip        string
	rotated   bool
	revoked   bool
	expired   bool
}

func seedDevice(t *testing.T, userID string, d device) string {
	t.Helper()

	id := d.id
	if id == "" {
		id = newID()
	}
	familyID := d.familyID
	if familyID == "" {
		familyID = newID()
	}

	mustExec(t, `INSERT INTO "AuthSession" (id, "userId", "tokenHash", "familyId", "userAgent", ip, "expiresAt", "rotatedAt", "revokedAt")
		VALUES ($1, $2, $3, $4, nullif($5, ''), nullif($6, ''),
			CASE WHEN $7 THEN CURRENT_TIMESTAMP - interval '1 minute' ELSE CURRENT_TIMESTAMP + interval '1 minute' END,
			CASE WHEN $8 THEN CURRENT_TIMESTAMP END,
			CASE WHEN $9 THEN CURRENT_TIMESTAMP END)`,
		id, userID, newID(), familyID, d.userAgent, d.ip, d.expired, d.rotated, d.revoked)
	return id
}

func TestAccount(t *testing.T) {
	const (
		email    = "cuenta@coaster.test"
		password = "la-de-siempre"
	)
	currentSessionID := "e2e-session-" + mockUser.id

	seedAccount := func(t *testing.T, withPassword bool) {
		resetDatabase(t)
		hash := ""
		if withPassword {
			var err error
			if hash, err = service.HashPassword(password); err != nil {
				t.Fatal(err)
			}
		}
		mustExec(t, `INSERT INTO "User" (id, email, name, "emailVerifiedAt", "passwordHash", "updatedAt")
			VALUES ($1, $2, 'Cuenta', CURRENT_TIMESTAMP, nullif($3, ''), CURRENT_TIMESTAMP)`, mockUser.id, email, hash)
	}

	linkGoogle := func(t *testing.T) {
		mustExec(t, `INSERT INTO "AuthIdentity" (id, "userId", provider, subject, email) VALUES ($1, $2, 'GOOGLE', '110000000000000000001', $3)`,
			newID(), mockUser.id, email)
	}

	revoked := func(t *testing.T, where string, args ...any) []bool {
		return queryValue[[]bool](t, `SELECT coalesce(array_agg("revokedAt" IS NOT NULL ORDER BY "createdAt"), '{}') FROM "AuthSession" WHERE `+where, args...)
	}

	t.Run("says how this person can get in", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)
		linkGoogle(t)

		account := api.get(t, "/account").expect(t, http.StatusOK).object(t)

		expectFields(t, "account", account, map[string]any{"email": email, "emailVerified": true, "hasPassword": true})
		identities, _ := account["identities"].([]any)
		if len(identities) != 1 {
			t.Fatalf("identities = %v, want one", identities)
		}
		expectFields(t, "identity", identities[0].(map[string]any), map[string]any{"provider": "GOOGLE", "email": email})
	})

	t.Run("never sends the password hash back", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		if body := string(api.get(t, "/account").expect(t, http.StatusOK).body); strings.Contains(body, "argon2") {
			t.Errorf("the account gives the hash away: %s", body)
		}
	})

	t.Run("lets somebody with only Google set a first password, warns them and closes the rest", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		linkGoogle(t)
		seedDevice(t, mockUser.id, device{familyID: "otra-sesion"})

		api.put(t, "/account/password", map[string]any{"password": "una-nueva-buena"}).expect(t, http.StatusNoContent)

		if hash := queryValue[string](t, `SELECT "passwordHash" FROM "User" WHERE id = $1`, mockUser.id); !service.VerifyPassword(hash, "una-nueva-buena") {
			t.Error("the new password was not stored")
		}
		api.post(t, "/auth/login", map[string]any{"email": email, "password": "una-nueva-buena"}, anonymous()).expect(t, http.StatusOK)
		if others := revoked(t, `"familyId" = 'otra-sesion'`); slices.Contains(others, false) {
			t.Errorf("sessions of the other device revoked = %v, want all", others)
		}
		api.mailbox.waitFor(t, "passwordChanged", email)
	})

	t.Run("asks for the current password before changing one that exists", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		api.put(t, "/account/password", map[string]any{"password": "una-nueva-buena"}).expect(t, http.StatusBadRequest)
		api.put(t, "/account/password", map[string]any{"password": "una-nueva-buena", "currentPassword": "la-equivocada"}).
			expect(t, http.StatusUnauthorized)
		api.put(t, "/account/password", map[string]any{"password": "una-nueva-buena", "currentPassword": password}).
			expect(t, http.StatusNoContent)
	})

	t.Run("lists one entry per device and says which one is asking", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{id: currentSessionID, familyID: "this-device", userAgent: "Mozilla/5.0 (Macintosh)", ip: "10.0.0.1"})
		seedDevice(t, mockUser.id, device{familyID: "the-tablet", userAgent: "Mozilla/5.0 (iPad)", ip: "10.0.0.2"})

		sessions := api.get(t, "/account/sessions").expect(t, http.StatusOK).list(t)

		if len(sessions) != 2 {
			t.Fatalf("sessions = %v, want two", sessions)
		}
		for _, session := range sessions {
			if session["id"] == currentSessionID {
				expectFields(t, "this device", session, map[string]any{"current": true, "userAgent": "Mozilla/5.0 (Macintosh)", "ip": "10.0.0.1"})
			} else if session["current"] != false {
				t.Errorf("%v is also marked current", session["id"])
			}
		}
	})

	t.Run("collapses the trail a device leaves behind every refresh", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{familyID: "this-device", rotated: true})
		seedDevice(t, mockUser.id, device{id: currentSessionID, familyID: "this-device"})

		sessions := api.get(t, "/account/sessions").expect(t, http.StatusOK).list(t)

		if len(sessions) != 1 || sessions[0]["id"] != currentSessionID {
			t.Errorf("sessions = %v, want only %s", sessions, currentSessionID)
		}
	})

	t.Run("leaves out what no longer lets anybody in", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{familyID: "closed", revoked: true})
		seedDevice(t, mockUser.id, device{familyID: "expired", expired: true})

		if sessions := api.get(t, "/account/sessions").expect(t, http.StatusOK).list(t); len(sessions) != 0 {
			t.Errorf("sessions = %v, want none", sessions)
		}
	})

	t.Run("never hands out the refresh tokens behind the sessions", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		sessionID := seedDevice(t, mockUser.id, device{})
		tokenHash := queryValue[string](t, `SELECT "tokenHash" FROM "AuthSession" WHERE id = $1`, sessionID)

		if body := string(api.get(t, "/account/sessions").expect(t, http.StatusOK).body); strings.Contains(body, tokenHash) {
			t.Error("the token hash is in the list")
		}
	})

	t.Run("closes a device for good, refresh token and all", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{id: currentSessionID, familyID: "this-device"})
		tabletID := seedDevice(t, mockUser.id, device{familyID: "the-tablet"})
		seedDevice(t, mockUser.id, device{familyID: "the-tablet", rotated: true})

		api.delete(t, "/account/sessions/"+tabletID).expect(t, http.StatusNoContent)

		if tablet := revoked(t, `"familyId" = 'the-tablet'`); slices.Contains(tablet, false) {
			t.Errorf("tablet sessions revoked = %v, want all", tablet)
		}
		if this := revoked(t, `id = $1`, currentSessionID); !slices.Equal(this, []bool{false}) {
			t.Error("this device was closed too")
		}
	})

	t.Run("refuses to close the session making the call", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{id: currentSessionID, familyID: "this-device"})

		api.delete(t, "/account/sessions/"+currentSessionID).expect(t, http.StatusBadRequest)

		if this := revoked(t, `id = $1`, currentSessionID); !slices.Equal(this, []bool{false}) {
			t.Error("the session making the call was closed")
		}
	})

	t.Run("does not let anybody close a session that is not theirs", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		otherID := newID()
		createUser(t, user{id: otherID, email: "otra@coaster.test", name: "Otra"})
		theirs := seedDevice(t, otherID, device{})

		api.delete(t, "/account/sessions/"+theirs).expect(t, http.StatusNotFound)

		if session := revoked(t, `id = $1`, theirs); !slices.Equal(session, []bool{false}) {
			t.Error("somebody else's session was closed")
		}
	})

	t.Run("answers plainly for a session that does not exist", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)

		api.delete(t, "/account/sessions/"+newID()).expect(t, http.StatusNotFound)
	})

	t.Run("closes every other device and leaves this one alone", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		seedDevice(t, mockUser.id, device{familyID: "this-device", rotated: true})
		seedDevice(t, mockUser.id, device{id: currentSessionID, familyID: "this-device"})
		seedDevice(t, mockUser.id, device{familyID: "the-tablet"})
		seedDevice(t, mockUser.id, device{familyID: "the-phone"})

		api.delete(t, "/account/sessions").expect(t, http.StatusNoContent)

		left := queryValue[[]string](t, `SELECT array_agg("familyId") FROM "AuthSession" WHERE "userId" = $1 AND "revokedAt" IS NULL`, mockUser.id)
		if !slices.Equal(left, []string{"this-device", "this-device"}) {
			t.Errorf("still open = %v, want only this device", left)
		}
	})

	t.Run("unlinks Google when a password is left to sign in with", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)
		linkGoogle(t)

		api.delete(t, "/account/identities/GOOGLE").expect(t, http.StatusNoContent)

		if identities := queryValue[int](t, `SELECT count(*) FROM "AuthIdentity" WHERE "userId" = $1`, mockUser.id); identities != 0 {
			t.Errorf("identities = %d, want 0", identities)
		}
	})

	t.Run("refuses to leave somebody with no way back in", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, false)
		linkGoogle(t)

		api.delete(t, "/account/identities/GOOGLE").expect(t, http.StatusBadRequest)

		if identities := queryValue[int](t, `SELECT count(*) FROM "AuthIdentity" WHERE "userId" = $1`, mockUser.id); identities != 1 {
			t.Errorf("identities = %d, want 1", identities)
		}
	})

	t.Run("refuses to unlink something that was never linked", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		api.delete(t, "/account/identities/GOOGLE").expect(t, http.StatusBadRequest)
	})

	t.Run("refuses a provider it has never heard of", func(t *testing.T) {
		api := newApp(t)
		seedAccount(t, true)

		api.delete(t, "/account/identities/FACEBOOK").expect(t, http.StatusBadRequest)
	})
}
