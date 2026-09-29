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

type workday struct {
	UserID         string   `json:"userId"`
	Date           string   `json:"date"`
	State          string   `json:"state"`
	WorkedMinutes  int      `json:"workedMinutes"`
	PlannedMinutes *int     `json:"plannedMinutes"`
	Discrepancies  []string `json:"discrepancies"`
	Entries        []struct {
		Type      string `json:"type"`
		Source    string `json:"source"`
		Amended   bool   `json:"amended"`
		Voided    bool   `json:"voided"`
		Revisions []struct {
			Reason *string `json:"reason"`
		} `json:"revisions"`
	} `json:"entries"`
}

type timeEntry struct {
	id           string
	action       string
	occurredAt   time.Time
	workdayDate  time.Time
	rootID       string
	supersedesID *string
	actorID      string
	reason       *string
	sequence     int64
	prevHash     string
	hash         string
}

func entriesOf(t *testing.T, userID string) []timeEntry {
	t.Helper()

	rows, err := testDB.Pool.Query(context.Background(), `SELECT id, action, "occurredAt", "workdayDate", "rootId", "supersedesId", "actorId", reason, sequence, "prevHash", hash
		FROM "TimeEntry" WHERE "userId" = $1 ORDER BY sequence`, userID)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()

	var entries []timeEntry
	for rows.Next() {
		var e timeEntry
		if err := rows.Scan(&e.id, &e.action, &e.occurredAt, &e.workdayDate, &e.rootID, &e.supersedesID, &e.actorID, &e.reason, &e.sequence, &e.prevHash, &e.hash); err != nil {
			t.Fatal(err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	return entries
}

func workdayOf(daysFromToday int) string {
	return domain.FormatWorkdayDate(domain.ShiftWorkdayDate(domain.ToWorkdayDate(time.Now()), daysFromToday))
}

func midnightUTC(t *testing.T, date string) time.Time {
	t.Helper()

	midnight, err := time.Parse(time.DateOnly, date)
	if err != nil {
		t.Fatal(err)
	}
	return midnight
}

func TestTimeTracking(t *testing.T) {
	type shop struct {
		base     string
		id       string
		workerID string
	}

	setup := func(t *testing.T) shop {
		resetWithMockUser(t)
		id := createEstablishment(t, "El Establishment")
		workerID := newID()
		createUser(t, user{id: workerID, email: "luis@example.com", name: "Luis"})
		addMember(t, id, workerID, domain.EstablishmentRoleStaff)
		return shop{base: "/establishments/" + id, id: id, workerID: workerID}
	}

	clock := func(t *testing.T, api *app, s shop, kind, userID string) *response {
		return api.post(t, s.base+"/time-entries/clock", map[string]any{"type": kind}, as(userID))
	}

	workdays := func(t *testing.T, api *app, path, userID string) []workday {
		var days []workday
		api.get(t, path, as(userID)).expect(t, http.StatusOK).decode(t, &days)
		return days
	}

	myWorkdays := func(t *testing.T, api *app, s shop, userID, query string) []workday {
		path := s.base + "/time-entries/me"
		if query != "" {
			path += "?" + query
		}
		return workdays(t, api, path, userID)
	}

	between := func(from, to string) string {
		return "from=" + from + "&to=" + to
	}

	current := func(t *testing.T, api *app, s shop, userID string) *workday {
		var day *workday
		api.get(t, s.base+"/time-entries/me/current", as(userID)).expect(t, http.StatusOK).decode(t, &day)
		return day
	}

	addMark := func(t *testing.T, api *app, s shop, kind string, occurredAt time.Time) *response {
		return api.post(t, s.base+"/time-entries", map[string]any{
			"userId": s.workerID, "type": kind, "occurredAt": occurredAt.UTC().Format(time.RFC3339Nano), "reason": "Alta manual del responsable",
		})
	}

	middayOf := func(t *testing.T, daysFromToday int) time.Time {
		return midnightUTC(t, workdayOf(daysFromToday)).Add(12 * time.Hour)
	}

	smallHoursAfter := func(t *testing.T, daysFromToday int) time.Time {
		return midnightUTC(t, workdayOf(daysFromToday+1)).Add(3 * time.Hour)
	}

	roster := func(t *testing.T, s shop, userID string, fromHour, toHour int) {
		today := workdayOf(0)
		mustExec(t, `INSERT INTO "Shift" (id, "startTime", "endTime", "userId", "establishmentId", "updatedAt")
			VALUES ($1, $2::timestamp, $3::timestamp, $4, $5, CURRENT_TIMESTAMP)`, newID(),
			fmt.Sprintf("%s %02d:00:00", today, fromHour), fmt.Sprintf("%s %02d:00:00", today, toHour), userID, s.id)
	}

	userIDs := func(days []workday) []string {
		var ids []string
		for _, day := range days {
			ids = append(ids, day.UserID)
		}
		return ids
	}

	t.Run("walks a whole workday and adds up the hours", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		for _, kind := range []string{"CLOCK_IN", "BREAK_START", "BREAK_END", "CLOCK_OUT"} {
			clock(t, api, s, kind, s.workerID).expect(t, http.StatusCreated)
		}

		day := myWorkdays(t, api, s, s.workerID, "")[0]

		if day.State != "OUT" || len(day.Entries) != 4 {
			t.Errorf("day = %s with %d entries, want OUT with 4", day.State, len(day.Entries))
		}
		for _, entry := range day.Entries {
			if entry.Source != "EMPLOYEE_DEVICE" {
				t.Errorf("source = %s, want EMPLOYEE_DEVICE", entry.Source)
			}
		}
	})

	t.Run("answers for a day nobody worked", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		if days := myWorkdays(t, api, s, s.workerID, between("2026-08-10", "2026-08-10")); len(days) != 0 {
			t.Errorf("days = %+v, want none", days)
		}
	})

	t.Run("reads back a day other than today", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		day := entriesOf(t, s.workerID)[0].workdayDate.Format(time.DateOnly)

		days := workdays(t, api, s.base+"/time-entries?"+between(day, day), mockUser.id)

		if days[0].Date != day || len(days[0].Entries) != 1 {
			t.Errorf("day = %s with %d entries, want %s with 1", days[0].Date, len(days[0].Entries), day)
		}
	})

	t.Run("refuses a punch that does not fit the day", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		messageContains(t, clock(t, api, s, "BREAK_START", s.workerID).expect(t, http.StatusBadRequest), string(domain.CodeInvalidClockSequence))
	})

	t.Run("stamps the server clock and chains every punch", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_OUT", s.workerID).expect(t, http.StatusCreated)

		entries := entriesOf(t, s.workerID)

		if len(entries) != 2 || entries[0].prevHash != strings.Repeat("0", 64) || entries[1].prevHash != entries[0].hash || entries[1].sequence-entries[0].sequence != 1 {
			t.Errorf("entries = %+v, want two chained punches", entries)
		}
	})

	t.Run("hands the owner their own day and not the whole team", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		roster(t, s, s.workerID, 7, 15)
		roster(t, s, mockUser.id, 15, 22)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_IN", mockUser.id).expect(t, http.StatusCreated)
		today := between(workdayOf(0), workdayOf(0))

		if ids := userIDs(myWorkdays(t, api, s, mockUser.id, today)); !slices.Equal(ids, []string{mockUser.id}) {
			t.Errorf("owner's days are of %v, want only theirs", ids)
		}
		if ids := userIDs(myWorkdays(t, api, s, s.workerID, today)); !slices.Equal(ids, []string{s.workerID}) {
			t.Errorf("worker's days are of %v, want only theirs", ids)
		}
	})

	t.Run("reads my own clock while a workmate is rostered and clocked in", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		roster(t, s, s.workerID, 7, 15)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_IN", mockUser.id).expect(t, http.StatusCreated)

		if day := current(t, api, s, mockUser.id); day == nil || day.UserID != mockUser.id || day.State != "IN" {
			t.Errorf("current = %+v, want the owner IN", day)
		}
	})

	t.Run("stays empty for me while only a rostered workmate worked", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		roster(t, s, s.workerID, 7, 15)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		if days := myWorkdays(t, api, s, mockUser.id, between(workdayOf(0), workdayOf(0))); len(days) != 0 {
			t.Errorf("days = %+v, want none", days)
		}
		if day := current(t, api, s, mockUser.id); day != nil {
			t.Errorf("current = %+v, want none", day)
		}
	})

	t.Run("answers for me even when asked for somebody else", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_IN", mockUser.id).expect(t, http.StatusCreated)

		days := myWorkdays(t, api, s, mockUser.id, between(workdayOf(0), workdayOf(0))+"&userId="+s.workerID)

		if ids := userIDs(days); !slices.Equal(ids, []string{mockUser.id}) {
			t.Errorf("days are of %v, want only the owner", ids)
		}
	})

	t.Run("moves the worker through in, break, back and out", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		steps := []struct{ kind, state string }{{"CLOCK_IN", "IN"}, {"BREAK_START", "ON_BREAK"}, {"BREAK_END", "IN"}, {"CLOCK_OUT", "OUT"}}

		for _, step := range steps {
			clock(t, api, s, step.kind, s.workerID).expect(t, http.StatusCreated)
			if state := myWorkdays(t, api, s, s.workerID, "")[0].State; state != step.state {
				t.Errorf("after %s the state is %s, want %s", step.kind, state, step.state)
			}
		}

		var kinds []string
		for _, entry := range myWorkdays(t, api, s, s.workerID, "")[0].Entries {
			kinds = append(kinds, entry.Type)
		}
		if !slices.Equal(kinds, []string{"CLOCK_IN", "BREAK_START", "BREAK_END", "CLOCK_OUT"}) {
			t.Errorf("entries = %v, want the four punches in order", kinds)
		}
	})

	t.Run("refuses the punches that make no sense at each step", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		steps := []struct {
			kind   string
			status int
		}{
			{"CLOCK_OUT", 400}, {"BREAK_END", 400}, {"CLOCK_IN", 201}, {"CLOCK_IN", 400},
			{"BREAK_END", 400}, {"BREAK_START", 201}, {"BREAK_START", 400},
		}

		for _, step := range steps {
			clock(t, api, s, step.kind, s.workerID).expect(t, step.status)
		}

		if day := myWorkdays(t, api, s, s.workerID, "")[0]; day.State != "ON_BREAK" || len(day.Entries) != 2 {
			t.Errorf("day = %s with %d entries, want ON_BREAK with 2", day.State, len(day.Entries))
		}
	})

	t.Run("lets the worker close the day straight from a break", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		for _, kind := range []string{"CLOCK_IN", "BREAK_START", "CLOCK_OUT"} {
			clock(t, api, s, kind, s.workerID).expect(t, http.StatusCreated)
		}

		if state := myWorkdays(t, api, s, s.workerID, "")[0].State; state != "OUT" {
			t.Errorf("state = %s, want OUT", state)
		}
	})

	t.Run("files a punch after midnight on the day the shift started", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -1)).expect(t, http.StatusCreated)
		addMark(t, api, s, "CLOCK_OUT", smallHoursAfter(t, -1)).expect(t, http.StatusCreated)

		yesterday := myWorkdays(t, api, s, s.workerID, between(workdayOf(-1), workdayOf(-1)))
		if len(yesterday) != 1 || yesterday[0].Date != workdayOf(-1) || yesterday[0].State != "OUT" || len(yesterday[0].Entries) != 2 {
			t.Errorf("yesterday = %+v, want it closed with both punches", yesterday)
		}
		if today := myWorkdays(t, api, s, s.workerID, between(workdayOf(0), workdayOf(0))); len(today) != 0 {
			t.Errorf("today = %+v, want nothing", today)
		}
	})

	t.Run("closes the day the shift started even days later", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -3)).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_OUT", s.workerID).expect(t, http.StatusCreated)

		opened := myWorkdays(t, api, s, s.workerID, between(workdayOf(-3), workdayOf(-3)))
		if len(opened) != 1 || opened[0].State != "OUT" || len(opened[0].Entries) != 2 {
			t.Errorf("the day opened three days ago = %+v, want it closed with both punches", opened)
		}
		if today := myWorkdays(t, api, s, s.workerID, between(workdayOf(0), workdayOf(0))); len(today) != 0 {
			t.Errorf("today = %+v, want nothing", today)
		}
	})

	t.Run("refuses to open a second day while the first is running", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -1)).expect(t, http.StatusCreated)

		messageContains(t, clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusBadRequest), string(domain.CodeInvalidClockSequence))
	})

	t.Run("keeps counting the hours of a day nobody closed", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -3)).expect(t, http.StatusCreated)

		opened := myWorkdays(t, api, s, s.workerID, between(workdayOf(-3), workdayOf(-3)))[0]
		if opened.State != "IN" || opened.WorkedMinutes <= 2*24*60 {
			t.Errorf("day = %s with %d minutes, want IN with more than two days", opened.State, opened.WorkedMinutes)
		}
	})

	t.Run("leaves a day closed two days ago out of the way of today", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -2)).expect(t, http.StatusCreated)
		addMark(t, api, s, "CLOCK_OUT", middayOf(t, -2)).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		if state := myWorkdays(t, api, s, s.workerID, between(workdayOf(0), workdayOf(0)))[0].State; state != "IN" {
			t.Errorf("today = %s, want IN", state)
		}
	})

	t.Run("the clock card is empty when no day was punched", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		if day := current(t, api, s, s.workerID); day != nil {
			t.Errorf("current = %+v, want none", day)
		}
	})

	t.Run("the clock card is today once today was punched", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_OUT", s.workerID).expect(t, http.StatusCreated)

		if day := current(t, api, s, s.workerID); day == nil || day.Date != workdayOf(0) || day.State != "OUT" {
			t.Errorf("current = %+v, want today OUT", day)
		}
	})

	t.Run("the clock card is the running day, whichever day it started", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -3)).expect(t, http.StatusCreated)

		if day := current(t, api, s, s.workerID); day == nil || day.Date != workdayOf(-3) || day.State != "IN" {
			t.Errorf("current = %+v, want the day three days ago IN", day)
		}
	})

	t.Run("the clock card goes back to today once the running day is closed", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		addMark(t, api, s, "CLOCK_IN", middayOf(t, -3)).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_OUT", s.workerID).expect(t, http.StatusCreated)

		if day := current(t, api, s, s.workerID); day != nil {
			t.Errorf("current = %+v, want none", day)
		}

		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		if day := current(t, api, s, s.workerID); day == nil || day.Date != workdayOf(0) || day.State != "IN" {
			t.Errorf("current = %+v, want today IN", day)
		}
	})

	amend := func(t *testing.T, api *app, s shop, entryID, userID string, occurredAt time.Time, reason string) *response {
		return api.post(t, s.base+"/time-entries/"+entryID+"/amend", map[string]any{
			"occurredAt": occurredAt.UTC().Format(time.RFC3339Nano), "reason": reason,
		}, as(userID))
	}

	t.Run("keeps the original punch and adds the correction on top", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		original := entriesOf(t, s.workerID)[0]

		amend(t, api, s, original.id, s.workerID, original.occurredAt.Add(-time.Hour), "Entre antes pero fiche tarde").expect(t, http.StatusCreated)

		entries := entriesOf(t, s.workerID)
		if len(entries) != 2 || !entries[0].occurredAt.Equal(original.occurredAt) {
			t.Fatalf("entries = %+v, want the original untouched and a correction", entries)
		}
		correction := entries[1]
		if correction.action != "AMENDED" || correction.supersedesID == nil || *correction.supersedesID != original.id ||
			correction.rootID != original.rootID || correction.reason == nil || *correction.reason != "Entre antes pero fiche tarde" ||
			correction.actorID != s.workerID {
			t.Errorf("correction = %+v, want an amendment of %s by the worker", correction, original.id)
		}
	})

	t.Run("shows the worker the history of their day", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		original := entriesOf(t, s.workerID)[0]
		amend(t, api, s, original.id, s.workerID, original.occurredAt.Add(-time.Hour), "Entre antes pero fiche tarde").expect(t, http.StatusCreated)

		entry := myWorkdays(t, api, s, s.workerID, "")[0].Entries[0]

		if !entry.Amended || len(entry.Revisions) != 2 || entry.Revisions[1].Reason == nil || *entry.Revisions[1].Reason != "Entre antes pero fiche tarde" {
			t.Errorf("entry = %+v, want it amended with two revisions", entry)
		}
	})

	t.Run("stops a worker from touching somebody else's hours", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", mockUser.id).expect(t, http.StatusCreated)
		ownersPunch := entriesOf(t, mockUser.id)[0]

		response := amend(t, api, s, ownersPunch.id, s.workerID, ownersPunch.occurredAt.Add(-time.Hour), "Entre antes pero fiche tarde")

		messageContains(t, response.expect(t, http.StatusForbidden), string(domain.CodeNotYourTimeEntry))
		if entries := entriesOf(t, mockUser.id); len(entries) != 1 {
			t.Errorf("owner's entries = %d, want 1", len(entries))
		}
	})

	t.Run("lets whoever runs the establishment fix anybody's hours", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]

		amend(t, api, s, punch.id, mockUser.id, punch.occurredAt.Add(-time.Hour), "Entre antes pero fiche tarde").expect(t, http.StatusCreated)

		if entries := entriesOf(t, s.workerID); len(entries) != 2 || entries[1].actorID != mockUser.id {
			t.Errorf("entries = %+v, want a correction by the owner", entries)
		}
	})

	t.Run("refuses a correction without a reason worth the name", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]

		amend(t, api, s, punch.id, s.workerID, punch.occurredAt, "ok").expect(t, http.StatusBadRequest)
	})

	t.Run("keeps a voided punch on the record", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]

		api.post(t, s.base+"/time-entries/"+punch.id+"/void", map[string]any{"reason": "Marca duplicada del terminal"}).expect(t, http.StatusCreated)

		if entries := entriesOf(t, s.workerID); len(entries) != 2 || entries[1].action != "VOIDED" {
			t.Errorf("entries = %+v, want the punch and its voiding", entries)
		}
		if entry := myWorkdays(t, api, s, s.workerID, "")[0].Entries[0]; !entry.Voided {
			t.Error("the punch is not shown as voided")
		}
	})

	t.Run("refuses an UPDATE straight against the database", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]

		_, err := testDB.Pool.Exec(context.Background(), `UPDATE "TimeEntry" SET "occurredAt" = now() WHERE id = $1`, punch.id)
		if err == nil || !strings.Contains(err.Error(), "append-only") {
			t.Errorf("err = %v, want the append-only trigger", err)
		}
	})

	t.Run("refuses a DELETE straight against the database", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]

		_, err := testDB.Pool.Exec(context.Background(), `DELETE FROM "TimeEntry" WHERE id = $1`, punch.id)
		if err == nil || !strings.Contains(err.Error(), "append-only") {
			t.Errorf("err = %v, want the append-only trigger", err)
		}
	})

	integrity := func(t *testing.T, api *app, s shop) map[string]any {
		return api.get(t, s.base+"/time-entries/integrity").expect(t, http.StatusOK).object(t)
	}

	t.Run("reports the chain as intact", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		clock(t, api, s, "CLOCK_OUT", s.workerID).expect(t, http.StatusCreated)

		expectFields(t, "integrity", integrity(t, api, s), map[string]any{"valid": true, "brokenAt": nil, "checkedEntries": 2})
	})

	tampering := []struct {
		name      string
		statement string
	}{
		{"catches a mark moved to another workday", `UPDATE "TimeEntry" SET "workdayDate" = "workdayDate" - INTERVAL '1 day' WHERE id = $1`},
		{"catches a mark reassigned to somebody else", `UPDATE "TimeEntry" SET "userSnapshot" = '{"name":"Otro","email":"otro@establishment.com"}'::jsonb WHERE id = $1`},
		{"catches an hour edited on the mark", `UPDATE "TimeEntry" SET "occurredAt" = "occurredAt" - INTERVAL '1 hour' WHERE id = $1`},
	}
	for _, tamper := range tampering {
		t.Run(tamper.name, func(t *testing.T) {
			api := newApp(t)
			s := setup(t)
			clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
			punch := entriesOf(t, s.workerID)[0]

			mustExec(t, `ALTER TABLE "TimeEntry" DISABLE TRIGGER USER`)
			mustExec(t, tamper.statement, punch.id)
			mustExec(t, `ALTER TABLE "TimeEntry" ENABLE TRIGGER USER`)

			expectFields(t, "integrity", integrity(t, api, s), map[string]any{"valid": false, "brokenAt": punch.id})
		})
	}

	t.Run("hands the inspector a CSV with one row per revision", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)
		punch := entriesOf(t, s.workerID)[0]
		amend(t, api, s, punch.id, mockUser.id, punch.occurredAt.Add(-time.Hour), "Olvido fichar").expect(t, http.StatusCreated)

		response := api.get(t, s.base+"/time-entries/export").expect(t, http.StatusOK)

		rows := strings.Split(strings.TrimSpace(string(response.body)), "\n")
		if !strings.Contains(response.header.Get("Content-Type"), "text/csv") || !strings.Contains(rows[0], "dia;empleado;marca;hora") ||
			len(rows) != 3 || !strings.Contains(rows[2], "Olvido fichar") {
			t.Errorf("export (%s):\n%s\nwant a header and two rows, the last with the reason", response.header.Get("Content-Type"), response.body)
		}
	})

	schedule := func(t *testing.T, s shop, startHour, endHour int) {
		roster(t, s, s.workerID, startHour, endHour)
	}

	teamToday := func(t *testing.T, api *app, s shop) *response {
		return api.get(t, s.base+"/time-entries?"+between(workdayOf(0), workdayOf(0))).expect(t, http.StatusOK)
	}

	t.Run("shows a scheduled day nobody clocked into", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		schedule(t, s, 8, 16)

		var days []workday
		teamToday(t, api, s).decode(t, &days)

		if days[0].UserID != s.workerID || !slices.Equal(days[0].Discrepancies, []string{"NO_SHOW"}) || days[0].PlannedMinutes == nil || *days[0].PlannedMinutes != 480 {
			t.Errorf("day = %+v, want the worker, NO_SHOW and 480 planned minutes", days[0])
		}
	})

	t.Run("flags a day worked with nothing on the rota", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		var days []workday
		teamToday(t, api, s).decode(t, &days)

		if !slices.Equal(days[0].Discrepancies, []string{"UNPLANNED"}) || days[0].PlannedMinutes != nil {
			t.Errorf("day = %+v, want UNPLANNED and nothing planned", days[0])
		}
	})

	t.Run("carries the planned window alongside the marks", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		schedule(t, s, 8, 16)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		day := teamToday(t, api, s).list(t)[0]

		if day["plannedMinutes"] != float64(480) {
			t.Errorf("plannedMinutes = %v, want 480", day["plannedMinutes"])
		}
		for _, key := range []string{"plannedStart", "plannedEnd"} {
			if _, ok := day[key]; !ok {
				t.Errorf("%s is missing", key)
			}
		}
	})

	t.Run("does not let a worker read the team timesheet", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)

		api.get(t, s.base+"/time-entries", as(s.workerID)).expect(t, http.StatusForbidden)
	})

	t.Run("lets whoever runs the establishment read it", func(t *testing.T) {
		api := newApp(t)
		s := setup(t)
		clock(t, api, s, "CLOCK_IN", s.workerID).expect(t, http.StatusCreated)

		if days := api.get(t, s.base+"/time-entries").expect(t, http.StatusOK).list(t); days[0]["userId"] != s.workerID {
			t.Errorf("first day is of %v, want %s", days[0]["userId"], s.workerID)
		}
	})
}
