package e2e

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

const (
	sessionCookie     = "coaster_session"
	sessionCookiePath = "/api/v1/auth"
)

type credentials struct {
	email    string
	password string
	name     string
}

var newcomer = credentials{email: "nueva@coaster.test", password: "a-good-enough-password", name: "Nueva"}

func seedAccount(t *testing.T, account credentials) string {
	t.Helper()

	hash, err := service.HashPassword(account.password)
	if err != nil {
		t.Fatal(err)
	}

	id := newID()
	mustExec(t, `INSERT INTO "User" (id, email, name, "passwordHash", "passwordUpdatedAt", "updatedAt")
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, id, account.email, account.name, hash)
	return id
}

func seedSession(t *testing.T, userID, token string, expiresIn time.Duration) string {
	t.Helper()

	mustExec(t, `INSERT INTO "AuthSession" (id, "userId", "tokenHash", "familyId", "expiresAt")
		VALUES ($1, $2, $3, 'family-1', CURRENT_TIMESTAMP + make_interval(secs => $4))`,
		newID(), userID, domain.HashRefreshToken(token), expiresIn.Seconds())
	return sessionCookie + "=" + token
}

func waitForAuthEvent(t *testing.T, eventType string) string {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		id := queryValue[string](t, `SELECT coalesce(max(id), '') FROM "AuthEvent" WHERE type::text = $1`, eventType)
		if id != "" {
			return id
		}
		time.Sleep(50 * time.Millisecond)
	}

	t.Fatalf("no %s event was written", eventType)
	return ""
}

func TestAuth(t *testing.T) {
	register := func(t *testing.T, api *app, body map[string]any) *response {
		return api.post(t, "/auth/register", body, anonymous())
	}

	registration := map[string]any{"email": newcomer.email, "password": newcomer.password, "name": newcomer.name}

	with := func(key string, value any) map[string]any {
		body := map[string]any{}
		for k, v := range registration {
			body[k] = v
		}
		body[key] = value
		return body
	}

	login := func(t *testing.T, api *app, email, password string) *response {
		return api.post(t, "/auth/login", map[string]any{"email": email, "password": password}, anonymous())
	}

	refresh := func(t *testing.T, api *app, cookie string) *response {
		if cookie == "" {
			return api.post(t, "/auth/refresh", nil, anonymous())
		}
		return api.post(t, "/auth/refresh", nil, anonymous(), withHeader("Cookie", cookie))
	}

	t.Run("register opens an account and hands back an access token", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		body := register(t, api, registration).expect(t, http.StatusCreated).object(t)

		expectFields(t, "user", body["user"].(map[string]any), map[string]any{"email": newcomer.email, "name": newcomer.name})
		if token, _ := body["accessToken"].(string); token == "" || body["expiresIn"] != float64(15*60) {
			t.Errorf("accessToken = %v, expiresIn = %v, want a token for 900 s", body["accessToken"], body["expiresIn"])
		}
	})

	t.Run("register stores the password hashed and never sends it back", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		body := string(register(t, api, registration).expect(t, http.StatusCreated).body)

		if hash := queryValue[string](t, `SELECT "passwordHash" FROM "User" WHERE email = $1`, newcomer.email); !strings.HasPrefix(hash, "$argon2id$") {
			t.Errorf("passwordHash = %q, want an argon2id hash", hash)
		}
		if strings.Contains(body, newcomer.password) || strings.Contains(body, "argon2") {
			t.Errorf("the response gives the password away: %s", body)
		}
	})

	t.Run("register puts the session in a cookie the browser cannot read", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		response := register(t, api, registration).expect(t, http.StatusCreated)
		cookie := response.cookie(t, sessionCookie)

		for _, attribute := range []string{"HttpOnly", "SameSite=Lax", "Path=" + sessionCookiePath} {
			if !strings.Contains(cookie, attribute) {
				t.Errorf("cookie %q lacks %s", cookie, attribute)
			}
		}
		if strings.Contains(string(response.body), cookieValue(cookie)) {
			t.Error("the session token is in the body too")
		}
	})

	t.Run("register refuses a second account on the same address", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		register(t, api, registration).expect(t, http.StatusConflict)
	})

	t.Run("register refuses a password shorter than eight characters", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		register(t, api, with("password", "short")).expect(t, http.StatusBadRequest)
	})

	t.Run("register refuses something that is not an email address", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		register(t, api, with("email", "not-an-address")).expect(t, http.StatusBadRequest)
	})

	t.Run("login signs in with the right password", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		response := login(t, api, newcomer.email, newcomer.password).expect(t, http.StatusOK)

		if email := response.object(t)["user"].(map[string]any)["email"]; email != newcomer.email {
			t.Errorf("user = %v, want %s", email, newcomer.email)
		}
		if cookie := response.cookie(t, sessionCookie); !strings.Contains(cookie, "HttpOnly") {
			t.Errorf("cookie %q is readable by the browser", cookie)
		}
	})

	t.Run("login signs in whatever the casing of the address", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		login(t, api, "Nueva@Coaster.TEST", newcomer.password).expect(t, http.StatusOK)
	})

	t.Run("login answers the same to a wrong password and to an unknown address", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		wrongPassword := login(t, api, newcomer.email, "not-the-password").expect(t, http.StatusUnauthorized).object(t)
		unknownAddress := login(t, api, "nobody@coaster.test", newcomer.password).expect(t, http.StatusUnauthorized).object(t)

		if wrongPassword["message"] != unknownAddress["message"] {
			t.Errorf("messages %v and %v differ", wrongPassword["message"], unknownAddress["message"])
		}
	})

	t.Run("login refuses a deactivated account", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)
		mustExec(t, `UPDATE "User" SET active = false WHERE email = $1`, newcomer.email)

		login(t, api, newcomer.email, newcomer.password).expect(t, http.StatusUnauthorized)
	})

	t.Run("refresh trades the cookie for a fresh access token", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		userID := seedAccount(t, newcomer)

		body := refresh(t, api, seedSession(t, userID, "a-seeded-refresh-token", time.Minute)).expect(t, http.StatusOK).object(t)

		if token, _ := body["accessToken"].(string); token == "" || body["user"].(map[string]any)["email"] != newcomer.email {
			t.Errorf("refresh = %v, want a token for %s", body, newcomer.email)
		}
	})

	t.Run("refresh hands back a different cookie every time", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		userID := seedAccount(t, newcomer)
		first := seedSession(t, userID, "a-seeded-refresh-token", time.Minute)

		second := refresh(t, api, first).expect(t, http.StatusOK).cookie(t, sessionCookie)

		if cookieValue(second) == cookieValue(first) {
			t.Error("the refreshed cookie is the same one")
		}
	})

	t.Run("refresh keeps the session alive across a chain of refreshes", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		cookie := seedSession(t, seedAccount(t, newcomer), "a-seeded-refresh-token", time.Minute)

		for turn := 0; turn < 4; turn++ {
			cookie = sessionCookie + "=" + cookieValue(refresh(t, api, cookie).expect(t, http.StatusOK).cookie(t, sessionCookie))
		}
	})

	t.Run("refresh refuses a request with no cookie", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		refresh(t, api, "").expect(t, http.StatusUnauthorized)
	})

	t.Run("refresh refuses a cookie nobody issued", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		refresh(t, api, sessionCookie+"=a-token-out-of-thin-air").expect(t, http.StatusUnauthorized)
	})

	t.Run("refresh refuses a session that has expired", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		cookie := seedSession(t, seedAccount(t, newcomer), "a-stale-token", -time.Second)

		refresh(t, api, cookie).expect(t, http.StatusUnauthorized)
	})

	t.Run("logout ends the session and clears the cookie", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		cookie := seedSession(t, seedAccount(t, newcomer), "a-seeded-refresh-token", time.Minute)

		response := api.post(t, "/auth/logout", nil, anonymous(), withHeader("Cookie", cookie)).expect(t, http.StatusNoContent)

		if cleared := response.cookie(t, sessionCookie); !strings.HasPrefix(cleared, sessionCookie+"=;") {
			t.Errorf("cookie = %q, want it cleared", cleared)
		}
		refresh(t, api, cookie).expect(t, http.StatusUnauthorized)
	})

	t.Run("logout does not complain without a session", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		api.post(t, "/auth/logout", nil, anonymous()).expect(t, http.StatusNoContent)
	})

	t.Run("the log writes down an account being opened", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)

		register(t, api, registration).expect(t, http.StatusCreated)
		eventID := waitForAuthEvent(t, "REGISTERED")

		row := queryValue[string](t, `SELECT email || ' ' || (ip IS NOT NULL) || ' ' || ("userId" IS NOT NULL) FROM "AuthEvent" WHERE id = $1`, eventID)
		if row != newcomer.email+" true true" {
			t.Errorf("event = %q, want the email, an ip and a user", row)
		}
	})

	t.Run("the log writes down who came in and against which session", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		login(t, api, newcomer.email, newcomer.password).expect(t, http.StatusOK)
		eventID := waitForAuthEvent(t, "LOGIN_SUCCEEDED")

		if known := queryValue[bool](t, `SELECT EXISTS (SELECT 1 FROM "AuthSession" s JOIN "AuthEvent" e ON e."sessionId" = s.id WHERE e.id = $1)`, eventID); !known {
			t.Error("the event does not point at the session that was opened")
		}
	})

	t.Run("the log writes down a failed attempt with a reason the caller never sees", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		seedAccount(t, newcomer)

		body := string(login(t, api, newcomer.email, "not-the-password").expect(t, http.StatusUnauthorized).body)
		eventID := waitForAuthEvent(t, "LOGIN_FAILED")

		if metadata := queryValue[string](t, `SELECT metadata::text FROM "AuthEvent" WHERE id = $1`, eventID); metadata != `{"reason": "wrong_password"}` {
			t.Errorf("metadata = %s, want the wrong_password reason", metadata)
		}
		if strings.Contains(body, "wrong_password") {
			t.Error("the caller is told the reason")
		}
	})

	t.Run("the log writes down somebody signing out", func(t *testing.T) {
		api := newApp(t)
		resetDatabase(t)
		userID := seedAccount(t, newcomer)
		cookie := seedSession(t, userID, "a-seeded-refresh-token", time.Minute)

		api.post(t, "/auth/logout", nil, anonymous(), withHeader("Cookie", cookie)).expect(t, http.StatusNoContent)
		eventID := waitForAuthEvent(t, "LOGGED_OUT")

		if owner := queryValue[string](t, `SELECT "userId" FROM "AuthEvent" WHERE id = $1`, eventID); owner != userID {
			t.Errorf("userId = %s, want %s", owner, userID)
		}
	})
}
