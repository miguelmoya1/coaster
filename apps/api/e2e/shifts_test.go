package e2e

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func messageContains(t *testing.T, r *response, code string) {
	t.Helper()

	if message := fmt.Sprint(r.object(t)["message"]); !strings.Contains(message, code) {
		t.Errorf("message = %s, want %s", message, code)
	}
}

func TestShifts(t *testing.T) {
	setup := func(t *testing.T) string {
		resetWithMockUser(t)
		return "/establishments/" + createEstablishment(t, "My Establishment")
	}

	idOf := func(base string) string {
		return strings.TrimPrefix(base, "/establishments/")
	}

	shift := func(userID string, startsIn, length time.Duration, notes string) map[string]any {
		now := time.Now().UTC()
		body := map[string]any{
			"startTime": now.Add(startsIn).Format(time.RFC3339Nano),
			"endTime":   now.Add(startsIn + length).Format(time.RFC3339Nano),
		}
		if userID != "" {
			body["userId"] = userID
		}
		if notes != "" {
			body["notes"] = notes
		}
		return body
	}

	shiftsOf := func(t *testing.T, base string) int {
		return queryValue[int](t, `SELECT count(*) FROM "Shift" WHERE "establishmentId" = $1`, idOf(base))
	}

	t.Run("creates a shift", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.post(t, base+"/shifts", shift(mockUser.id, 0, 24*time.Hour, "Morning shift")).expect(t, http.StatusCreated)

		created := queryValue[string](t, `SELECT string_agg("userId" || ' ' || notes, ',') FROM "Shift" WHERE "establishmentId" = $1`, idOf(base))
		if created != mockUser.id+" Morning shift" {
			t.Errorf("shifts = %q, want the morning shift of %s", created, mockUser.id)
		}
	})

	t.Run("rejects a shift without a person", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.post(t, base+"/shifts", shift("", 0, 0, "")).expect(t, http.StatusBadRequest)
	})

	t.Run("refuses to schedule somebody who does not work there", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)
		strangerID := newID()
		createUser(t, user{id: strangerID, email: "stranger@elsewhere.com", name: "Stranger"})

		api.post(t, base+"/shifts", shift(strangerID, 0, time.Hour, "")).expect(t, http.StatusNotFound)

		if count := shiftsOf(t, base); count != 0 {
			t.Errorf("shifts = %d, want 0", count)
		}
	})

	t.Run("refuses a shift that ends before it starts", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)

		api.post(t, base+"/shifts", shift(mockUser.id, 0, -time.Hour, "")).expect(t, http.StatusBadRequest)

		if count := shiftsOf(t, base); count != 0 {
			t.Errorf("shifts = %d, want 0", count)
		}
	})

	t.Run("lists the shifts", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)
		shiftID := createShift(t, idOf(base), mockUser.id, 0, time.Hour, "Test shift")

		shifts := api.get(t, base+"/shifts").expect(t, http.StatusOK).list(t)

		if len(shifts) != 1 || shifts[0]["id"] != shiftID || shifts[0]["notes"] != "Test shift" {
			t.Errorf("shifts = %v, want only %s", shifts, shiftID)
		}
	})

	t.Run("deletes a shift", func(t *testing.T) {
		api := newApp(t)
		base := setup(t)
		shiftID := createShift(t, idOf(base), mockUser.id, 0, time.Hour, "")

		api.delete(t, base+"/shifts/"+shiftID).expect(t, http.StatusOK)

		if count := queryValue[int](t, `SELECT count(*) FROM "Shift" WHERE id = $1`, shiftID); count != 0 {
			t.Error("the shift is still there")
		}
	})
}

func TestShiftExchanges(t *testing.T) {
	type shop struct {
		base    string
		id      string
		shiftID string
	}

	setup := func(t *testing.T) shop {
		resetWithMockUser(t)
		id := createEstablishment(t, "My Establishment")
		return shop{base: "/establishments/" + id, id: id, shiftID: createShift(t, id, mockUser.id, time.Hour, 4*time.Hour, "")}
	}

	t.Run("requests an exchange", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		api.post(t, s.base+"/shifts/"+s.shiftID+"/exchanges", map[string]any{}).expect(t, http.StatusCreated)

		exchange := queryValue[string](t, `SELECT string_agg("requesterId" || ' ' || status, ',') FROM "ShiftExchange" WHERE "shiftId" = $1`, s.shiftID)
		if exchange != mockUser.id+" PENDING" {
			t.Errorf("exchanges = %q, want a pending one by %s", exchange, mockUser.id)
		}
	})

	t.Run("lists the pending exchanges", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := createExchange(t, s.shiftID, mockUser.id, "")

		exchanges := api.get(t, s.base+"/exchanges").expect(t, http.StatusOK).list(t)

		if len(exchanges) != 1 || exchanges[0]["id"] != exchangeID {
			t.Errorf("exchanges = %v, want only %s", exchanges, exchangeID)
		}
	})

	t.Run("accepts an exchange", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		otherID := newID()
		createUser(t, user{id: otherID, email: "other@example.com", name: "Other"})
		addMember(t, s.id, otherID, domain.EstablishmentRoleStaff)
		exchangeID := createExchange(t, s.shiftID, otherID, mockUser.id)

		api.patch(t, s.base+"/exchanges/"+exchangeID+"/accept", nil).expect(t, http.StatusOK)

		if status := queryValue[string](t, `SELECT status FROM "ShiftExchange" WHERE id = $1`, exchangeID); status != "APPROVED" {
			t.Errorf("status = %s, want APPROVED", status)
		}
	})

	t.Run("cancels an exchange", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := createExchange(t, s.shiftID, mockUser.id, "")

		api.delete(t, s.base+"/exchanges/"+exchangeID).expect(t, http.StatusOK)

		if count := queryValue[int](t, `SELECT count(*) FROM "ShiftExchange" WHERE id = $1`, exchangeID); count != 0 {
			t.Error("the exchange is still there")
		}
	})
}

func TestShiftExchangeLifecycle(t *testing.T) {
	type shop struct {
		base    string
		id      string
		shiftID string
		mateID  string
	}

	setup := func(t *testing.T) shop {
		resetWithMockUser(t)
		id := createEstablishment(t, "El Establishment")
		mateID := newID()
		createUser(t, user{id: mateID, email: "mate@example.com", name: "Compañera"})
		addMember(t, id, mateID, domain.EstablishmentRoleStaff)
		return shop{base: "/establishments/" + id, id: id, mateID: mateID, shiftID: createShift(t, id, mockUser.id, 24*time.Hour, 4*time.Hour, "")}
	}

	offer := func(t *testing.T, api *app, s shop, options ...option) *response {
		return api.post(t, s.base+"/shifts/"+s.shiftID+"/exchanges", map[string]any{}, options...)
	}

	acceptAs := func(t *testing.T, api *app, s shop, exchangeID, userID string) *response {
		return api.patch(t, s.base+"/exchanges/"+exchangeID+"/accept", nil, as(userID))
	}

	offered := func(t *testing.T, api *app, s shop) string {
		offer(t, api, s).expect(t, http.StatusCreated)
		return queryValue[string](t, `SELECT id FROM "ShiftExchange" WHERE "shiftId" = $1`, s.shiftID)
	}

	ownerOf := func(t *testing.T, shiftID string) string {
		return queryValue[string](t, `SELECT "userId" FROM "Shift" WHERE id = $1`, shiftID)
	}

	t.Run("hands the shift to whoever takes the offer", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := offered(t, api, s)

		acceptAs(t, api, s, exchangeID, s.mateID).expect(t, http.StatusOK)

		closed := queryValue[string](t, `SELECT status || ' ' || "targetId" FROM "ShiftExchange" WHERE id = $1`, exchangeID)
		if ownerOf(t, s.shiftID) != s.mateID || closed != "APPROVED "+s.mateID {
			t.Errorf("shift owner %s, exchange %s, want both to be %s", ownerOf(t, s.shiftID), closed, s.mateID)
		}
	})

	t.Run("lets the new owner offer the same shift again", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		acceptAs(t, api, s, offered(t, api, s), s.mateID).expect(t, http.StatusOK)

		offer(t, api, s, as(s.mateID)).expect(t, http.StatusCreated)

		statuses := queryValue[[]string](t, `SELECT array_agg(status) FROM "ShiftExchange" WHERE "shiftId" = $1`, s.shiftID)
		pending := 0
		for _, status := range statuses {
			if status == "PENDING" {
				pending++
			}
		}
		if len(statuses) != 2 || pending != 1 {
			t.Errorf("exchanges = %v, want two with one pending", statuses)
		}
	})

	t.Run("keeps at most one live offer per shift, even bypassing the check", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		offer(t, api, s).expect(t, http.StatusCreated)

		_, err := testDB.Pool.Exec(context.Background(), `INSERT INTO "ShiftExchange" (id, "shiftId", "requesterId", status) VALUES ($1, $2, $3, 'PENDING')`,
			newID(), s.shiftID, mockUser.id)
		if err == nil {
			t.Error("the database took a second pending offer")
		}
	})

	t.Run("turns the second acceptance down", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := offered(t, api, s)
		acceptAs(t, api, s, exchangeID, s.mateID).expect(t, http.StatusOK)
		thirdID := newID()
		createUser(t, user{id: thirdID, email: "third@example.com", name: "Tercero"})
		addMember(t, s.id, thirdID, domain.EstablishmentRoleStaff)

		messageContains(t, acceptAs(t, api, s, exchangeID, thirdID).expect(t, http.StatusBadRequest), string(domain.CodeInvalidExchange))

		if owner := ownerOf(t, s.shiftID); owner != s.mateID {
			t.Errorf("shift owner = %s, want %s", owner, s.mateID)
		}
	})

	t.Run("refuses to hand over a shift that already started", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		runningID := createShift(t, s.id, mockUser.id, -time.Hour, 4*time.Hour, "")
		exchangeID := createExchange(t, runningID, mockUser.id, "")

		messageContains(t, acceptAs(t, api, s, exchangeID, s.mateID).expect(t, http.StatusBadRequest), string(domain.CodeExchangeShiftAlreadyStarted))

		if owner := ownerOf(t, runningID); owner != mockUser.id {
			t.Errorf("shift owner = %s, want %s", owner, mockUser.id)
		}
	})

	t.Run("refuses to erase an exchange that already happened", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := offered(t, api, s)
		acceptAs(t, api, s, exchangeID, s.mateID).expect(t, http.StatusOK)

		messageContains(t, api.delete(t, s.base+"/exchanges/"+exchangeID).expect(t, http.StatusBadRequest), string(domain.CodeExchangeAlreadyClosed))

		if count := queryValue[int](t, `SELECT count(*) FROM "ShiftExchange" WHERE id = $1`, exchangeID); count != 1 {
			t.Error("the exchange was erased")
		}
	})

	t.Run("still lets the requester withdraw a live offer", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		exchangeID := offered(t, api, s)

		api.delete(t, s.base+"/exchanges/"+exchangeID).expect(t, http.StatusOK)

		if count := queryValue[int](t, `SELECT count(*) FROM "ShiftExchange" WHERE id = $1`, exchangeID); count != 0 {
			t.Error("the exchange is still there")
		}
	})

	t.Run("lists an offer for a shift starting early today in Madrid", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		earlyID := newID()
		mustExec(t, `INSERT INTO "Shift" (id, "startTime", "endTime", "userId", "establishmentId", "updatedAt")
			SELECT $1, early, early + interval '1 hour', $2, $3, CURRENT_TIMESTAMP
			FROM (SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') + interval '30 minutes') AT TIME ZONE 'Europe/Madrid' AT TIME ZONE 'UTC' AS early) local`,
			earlyID, mockUser.id, s.id)
		createExchange(t, earlyID, mockUser.id, "")

		var shiftIDs []string
		for _, exchange := range api.get(t, s.base+"/exchanges").expect(t, http.StatusOK).list(t) {
			shiftIDs = append(shiftIDs, fmt.Sprint(exchange["shiftId"]))
		}
		if !slices.Contains(shiftIDs, earlyID) {
			t.Errorf("exchanges for %v, want %s among them", shiftIDs, earlyID)
		}
	})
}
