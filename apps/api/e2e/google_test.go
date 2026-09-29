package e2e

import (
	"maps"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"coaster-api/internal/service"
)

const (
	googleSubject = "110000000000000000001"
	googleEmail   = "alguien@coaster.test"
)

func googleToken(t *testing.T, overrides jwt.MapClaims) string {
	t.Helper()

	claims := jwt.MapClaims{
		"iss":            "https://accounts.google.com",
		"aud":            googleClientID,
		"sub":            googleSubject,
		"exp":            time.Now().Add(time.Hour).Unix(),
		"email":          googleEmail,
		"email_verified": true,
		"name":           "Alguien",
		"picture":        "https://lh3.googleusercontent.com/a/photo",
	}
	maps.Copy(claims, overrides)

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = googleKeyID

	signed, err := token.SignedString(googleKey)
	if err != nil {
		t.Fatalf("signing a Google token: %v", err)
	}
	return signed
}

func TestGoogleSignIn(t *testing.T) {
	signIn := func(t *testing.T, api *app, credential string) *response {
		return api.post(t, "/auth/google", map[string]any{"credential": credential}, anonymous())
	}

	seedUser := func(t *testing.T, password string, verified, active bool) string {
		hash := ""
		if password != "" {
			var err error
			if hash, err = service.HashPassword(password); err != nil {
				t.Fatal(err)
			}
		}
		id := newID()
		mustExec(t, `INSERT INTO "User" (id, email, name, "passwordHash", "emailVerifiedAt", active, "updatedAt")
			VALUES ($1, $2, 'Alguien', nullif($3, ''), CASE WHEN $4 THEN CURRENT_TIMESTAMP END, $5, CURRENT_TIMESTAMP)`,
			id, googleEmail, hash, verified, active)
		return id
	}

	userOf := func(t *testing.T, r *response) map[string]any {
		return r.object(t)["user"].(map[string]any)
	}

	t.Run("opens an account, already verified, for somebody new", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		response := signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK)

		expectFields(t, "user", userOf(t, response), map[string]any{"email": googleEmail, "name": "Alguien"})
		if token, _ := response.object(t)["accessToken"].(string); token == "" {
			t.Error("no access token")
		}
		stored := queryValue[string](t, `SELECT ("emailVerifiedAt" IS NOT NULL) || ' ' || ("passwordHash" IS NULL) FROM "User" WHERE email = $1`, googleEmail)
		identity := queryValue[string](t, `SELECT string_agg(provider::text || ' ' || subject, ',') FROM "AuthIdentity"`)
		if stored != "true true" || identity != "GOOGLE "+googleSubject {
			t.Errorf("user verified/without password = %s, identities = %s", stored, identity)
		}
		if cookie := response.cookie(t, sessionCookie); !strings.Contains(cookie, "HttpOnly") {
			t.Errorf("cookie %q is readable by the browser", cookie)
		}
	})

	t.Run("lands on the same record the second time", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		first := userOf(t, signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK))
		second := userOf(t, signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK))

		if second["id"] != first["id"] {
			t.Errorf("users %v and %v, want the same", first["id"], second["id"])
		}
		if identities := queryValue[int](t, `SELECT count(*) FROM "AuthIdentity"`); identities != 1 {
			t.Errorf("identities = %d, want 1", identities)
		}
	})

	t.Run("claims the record of somebody invited who never got in", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		invitedID := seedUser(t, "", false, true)

		if id := userOf(t, signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK))["id"]; id != invitedID {
			t.Errorf("user = %v, want %s", id, invitedID)
		}
		if users := queryValue[int](t, `SELECT count(*) FROM "User"`); users != 1 {
			t.Errorf("users = %d, want 1", users)
		}
	})

	t.Run("keeps the password of an owner who had been verified", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedUser(t, "a-good-enough-password", true, true)

		signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK)

		if kept := queryValue[bool](t, `SELECT "passwordHash" IS NOT NULL FROM "User" WHERE email = $1`, googleEmail); !kept {
			t.Error("the password was dropped")
		}
	})

	t.Run("drops a password nobody ever proved", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedUser(t, "a-good-enough-password", false, true)

		signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK)

		stored := queryValue[string](t, `SELECT ("passwordHash" IS NULL) || ' ' || ("emailVerifiedAt" IS NOT NULL) FROM "User" WHERE email = $1`, googleEmail)
		if stored != "true true" {
			t.Errorf("password dropped/verified = %s, want true true", stored)
		}
		api.post(t, "/auth/login", map[string]any{"email": googleEmail, "password": "a-good-enough-password"}, anonymous()).
			expect(t, http.StatusUnauthorized)
	})

	t.Run("follows the same person to a new Google account on the same verified address", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		userID := seedUser(t, "", true, true)
		mustExec(t, `INSERT INTO "AuthIdentity" (id, "userId", provider, subject, email) VALUES ($1, $2, 'GOOGLE', 'un-sub-anterior', $3)`,
			newID(), userID, googleEmail)

		if id := userOf(t, signIn(t, api, googleToken(t, nil)).expect(t, http.StatusOK))["id"]; id != userID {
			t.Errorf("user = %v, want %s", id, userID)
		}
		if subjects := queryValue[[]string](t, `SELECT array_agg(subject) FROM "AuthIdentity" WHERE "userId" = $1`, userID); len(subjects) != 1 || subjects[0] != googleSubject {
			t.Errorf("subjects = %v, want only %s", subjects, googleSubject)
		}
	})

	t.Run("refuses a token minted for another client", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		signIn(t, api, googleToken(t, jwt.MapClaims{"aud": "somebody-else.apps.googleusercontent.com"})).expect(t, http.StatusUnauthorized)
	})

	t.Run("refuses a deactivated account", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedUser(t, "", false, false)

		signIn(t, api, googleToken(t, nil)).expect(t, http.StatusUnauthorized)
	})
}
