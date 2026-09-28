package service

import (
	"context"
	"slices"
	"testing"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type timeEntryFixture struct {
	service *TimeEntryService
	repo    *fakeTimeEntryRepository
	shifts  *fakeShiftRepository
	events  *shiftEventRecorder
	now     time.Time
}

func newTimeEntryFixture() *timeEntryFixture {
	f := &timeEntryFixture{
		repo:   newFakeTimeEntryRepository(),
		shifts: &fakeShiftRepository{},
		events: &shiftEventRecorder{},
		now:    time.Date(2026, 8, 8, 10, 0, 0, 0, time.UTC),
	}
	f.repo.addMember("worker", "Luis", domain.EstablishmentRoleStaff)
	f.repo.addMember("manager", "Marta", domain.EstablishmentRoleManager)

	securityService, _ := newTestSecurity(&fakeSecurity{}, nil)
	shiftService := NewShiftService(f.shifts, securityService, f.events, &shiftRealtimeRecorder{})

	f.service = NewTimeEntryService(f.repo, shiftService, f.events)
	f.service.now = func() time.Time { return f.now }

	return f
}

var (
	timeEntryWorker  = &domain.User{ID: "worker", Name: "Luis", Email: "luis@example.com", Role: domain.RoleUser}
	timeEntryManager = &domain.User{ID: "manager", Name: "Marta", Email: "marta@example.com", Role: domain.RoleUser}
	timeEntryAdmin   = &domain.User{ID: "admin", Name: "Admin", Email: "admin@example.com", Role: domain.RoleAdmin}
)

func timeEntryAt(iso string) time.Time {
	parsed, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		panic(err)
	}
	return parsed
}

func timeEntryWorkday(date string) time.Time {
	parsed, _ := domain.ParseWorkdayDate(date)
	return parsed
}

func (f *timeEntryFixture) punch(userID string, punchType domain.TimeEntryType, occurredAt, workday string) domain.TimeEntryRow {
	row, _ := f.repo.Append(context.Background(), domain.AppendTimeEntry{
		EstablishmentID: "e1",
		UserID:          userID,
		UserSnapshot:    domain.TimeEntrySnapshot{Name: f.repo.names[userID]},
		Type:            punchType,
		Action:          domain.TimeEntryRecordedAction,
		OccurredAt:      timeEntryAt(occurredAt),
		WorkdayDate:     timeEntryWorkday(workday),
		Source:          domain.TimeEntryFromEmployeeDevice,
		ActorID:         userID,
	})
	return *row
}

func TestTimeEntryServiceClock(t *testing.T) {
	latitude, longitude := 40.4, -3.7

	t.Run("stamps the server clock and files it on today", func(t *testing.T) {
		f := newTimeEntryFixture()
		f.now = f.now.Add(123456 * time.Microsecond)

		entry, err := f.service.Clock(context.Background(), "e1", timeEntryWorker, ClockInput{Type: domain.TimeEntryClockIn, Latitude: &latitude, Longitude: &longitude})
		if err != nil {
			t.Fatal(err)
		}

		row := f.repo.rows[0]
		if !row.OccurredAt.Equal(f.now.Truncate(time.Millisecond)) || row.Source != domain.TimeEntryFromEmployeeDevice || row.ActorID != "worker" {
			t.Fatalf("row = %+v", row)
		}
		if entry.WorkdayDate != "2026-08-08" || *entry.Latitude != latitude || *entry.Longitude != longitude {
			t.Fatalf("entry = %+v", entry)
		}
		if row.UserSnapshot != (domain.TimeEntrySnapshot{Name: "Luis", Email: "luis@example.com"}) {
			t.Fatalf("snapshot = %+v", row.UserSnapshot)
		}

		recorded, ok := f.events.events[0].(domain.TimeEntryRecorded)
		if !ok || recorded.ActorID != "worker" || recorded.ActorRole != domain.RoleUser || recorded.Reason != nil || recorded.Entry.ID != entry.ID {
			t.Fatalf("event = %+v", f.events.events)
		}
	})

	t.Run("keeps a night shift on the workday it started", func(t *testing.T) {
		f := newTimeEntryFixture()
		f.punch("worker", domain.TimeEntryClockIn, "2026-08-07T20:00:00Z", "2026-08-07")

		entry, err := f.service.Clock(context.Background(), "e1", timeEntryWorker, ClockInput{Type: domain.TimeEntryClockOut})
		if err != nil || entry.WorkdayDate != "2026-08-07" {
			t.Fatalf("entry = %+v, %v", entry, err)
		}
	})

	t.Run("closes the open workday however many days ago it opened", func(t *testing.T) {
		f := newTimeEntryFixture()
		f.punch("worker", domain.TimeEntryClockIn, "2026-08-04T20:00:00Z", "2026-08-04")

		entry, err := f.service.Clock(context.Background(), "e1", timeEntryWorker, ClockInput{Type: domain.TimeEntryClockOut})
		if err != nil || entry.WorkdayDate != "2026-08-04" {
			t.Fatalf("entry = %+v, %v", entry, err)
		}
	})

	tests := []struct {
		name  string
		setup func(f *timeEntryFixture)
		punch domain.TimeEntryType
	}{
		{"refuses a second workday while one is running", func(f *timeEntryFixture) {
			f.punch("worker", domain.TimeEntryClockIn, "2026-08-07T20:00:00Z", "2026-08-07")
		}, domain.TimeEntryClockIn},
		{"refuses a break from someone who never clocked in", func(*timeEntryFixture) {}, domain.TimeEntryBreakStart},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newTimeEntryFixture()
			tt.setup(f)
			before := len(f.repo.rows)

			_, err := f.service.Clock(context.Background(), "e1", timeEntryWorker, ClockInput{Type: tt.punch})
			if !domain.HasCode(err, domain.CodeInvalidClockSequence) || len(f.repo.rows) != before {
				t.Fatalf("err = %v, rows = %d", err, len(f.repo.rows))
			}
		})
	}
}

func TestTimeEntryServiceCreateManual(t *testing.T) {
	tests := []struct {
		name  string
		input ManualTimeEntryInput
		setup func(f *timeEntryFixture)
		code  string
	}{
		{"records it as manual with the reason", ManualTimeEntryInput{UserID: "worker", Type: domain.TimeEntryClockIn, OccurredAt: "2026-08-08T06:00:00.000Z", Reason: "  Olvidó fichar  "}, nil, ""},
		{"refuses somebody who does not work here", ManualTimeEntryInput{UserID: "stranger", Type: domain.TimeEntryClockIn, OccurredAt: "2026-08-08T06:00:00Z", Reason: "Olvidó fichar"}, nil, domain.CodeMemberNotFound},
		{"refuses a mark that breaks the day", ManualTimeEntryInput{UserID: "worker", Type: domain.TimeEntryClockOut, OccurredAt: "2026-08-08T06:00:00Z", Reason: "Olvidó fichar"}, nil, domain.CodeInvalidClockSequence},
		{"refuses a date it cannot read", ManualTimeEntryInput{UserID: "worker", Type: domain.TimeEntryClockIn, OccurredAt: "2026-02-30", Reason: "Olvidó fichar"}, nil, domain.CodeInvalidDate},
		{"files a clock out after midnight on the day before", ManualTimeEntryInput{UserID: "worker", Type: domain.TimeEntryClockOut, OccurredAt: "2026-08-08T01:00:00Z", Reason: "Olvidó fichar"}, func(f *timeEntryFixture) {
			f.punch("worker", domain.TimeEntryClockIn, "2026-08-07T18:00:00Z", "2026-08-07")
		}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newTimeEntryFixture()
			if tt.setup != nil {
				tt.setup(f)
			}
			before := len(f.repo.rows)

			entry, err := f.service.CreateManual(context.Background(), "e1", timeEntryManager, tt.input)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.rows) != before {
					t.Fatalf("err = %v, rows = %d; want %s", err, len(f.repo.rows), tt.code)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			row := f.repo.rows[len(f.repo.rows)-1]
			if row.Source != domain.TimeEntryManual || row.ActorID != "manager" || *row.Reason != "Olvidó fichar" || row.UserSnapshot.Name != "Luis" {
				t.Fatalf("row = %+v", row)
			}
			if tt.setup != nil && entry.WorkdayDate != "2026-08-07" {
				t.Fatalf("workday = %s", entry.WorkdayDate)
			}

			recorded := f.events.events[0].(domain.TimeEntryRecorded)
			if recorded.Reason == nil || *recorded.Reason != "Olvidó fichar" {
				t.Fatalf("event = %+v", recorded)
			}
		})
	}
}

func TestTimeEntryServiceAmend(t *testing.T) {
	tests := []struct {
		name       string
		prepare    func(f *timeEntryFixture) string
		actor      *domain.User
		occurredAt string
		code       string
	}{
		{"a timeEntryWorker fixes their own mark", func(f *timeEntryFixture) string {
			return f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08").ID
		}, timeEntryWorker, "2026-08-08T07:00:00Z", ""},
		{"a timeEntryManager fixes anybody's", func(f *timeEntryFixture) string {
			return f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08").ID
		}, timeEntryManager, "2026-08-08T07:00:00Z", ""},
		{"a platform timeEntryAdmin fixes anybody's", func(f *timeEntryFixture) string {
			return f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08").ID
		}, timeEntryAdmin, "2026-08-08T07:00:00Z", ""},
		{"a timeEntryWorker cannot touch somebody else's", func(f *timeEntryFixture) string {
			return f.punch("manager", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08").ID
		}, timeEntryWorker, "2026-08-08T07:00:00Z", domain.CodeNotYourTimeEntry},
		{"a mark that does not exist", func(*timeEntryFixture) string { return "missing" }, timeEntryWorker, "2026-08-08T07:00:00Z", domain.CodeTimeEntryNotFound},
		{"a mark that is not the current one", func(f *timeEntryFixture) string {
			original := f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")
			f.service.Amend(context.Background(), "e1", original.ID, timeEntryWorker, AmendTimeEntryInput{OccurredAt: "2026-08-08T07:30:00Z", Reason: "Primera corrección"})
			return original.ID
		}, timeEntryWorker, "2026-08-08T07:00:00Z", domain.CodeTimeEntryNotCurrent},
		{"an hour that leaves the day out of order", func(f *timeEntryFixture) string {
			in := f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")
			f.punch("worker", domain.TimeEntryClockOut, "2026-08-08T16:00:00Z", "2026-08-08")
			return in.ID
		}, timeEntryWorker, "2026-08-08T17:00:00Z", domain.CodeInvalidClockSequence},
		{"an unparseable hour", func(f *timeEntryFixture) string {
			return f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08").ID
		}, timeEntryWorker, "no es una hora", domain.CodeInvalidDate},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newTimeEntryFixture()
			entryID := tt.prepare(f)
			f.events.events = nil
			before := len(f.repo.rows)

			entry, err := f.service.Amend(context.Background(), "e1", entryID, tt.actor, AmendTimeEntryInput{OccurredAt: tt.occurredAt, Reason: " Entré antes "})

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.rows) != before {
					t.Fatalf("err = %v, rows = %d; want %s", err, len(f.repo.rows), tt.code)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			original := f.repo.rows[0]
			correction := f.repo.rows[len(f.repo.rows)-1]
			if !original.OccurredAt.Equal(timeEntryAt("2026-08-08T08:00:00Z")) {
				t.Fatal("the original row must stay as it was")
			}
			if correction.Action != domain.TimeEntryAmendedAction || *correction.SupersedesID != original.ID ||
				correction.RootID != original.RootID || *correction.Reason != "Entré antes" || correction.ActorID != tt.actor.ID {
				t.Fatalf("correction = %+v", correction)
			}
			if !entry.Amended || len(entry.Revisions) != 2 || !entry.OccurredAt.Equal(timeEntryAt("2026-08-08T07:00:00Z")) {
				t.Fatalf("entry = %+v", entry)
			}

			amended := f.events.events[0].(domain.TimeEntryAmended)
			if amended.PreviousOccurredAt != "2026-08-08T08:00:00.000Z" || amended.Reason != "Entré antes" || amended.ActorRole != tt.actor.Role {
				t.Fatalf("event = %+v", amended)
			}
		})
	}
}

func TestTimeEntryServiceVoid(t *testing.T) {
	t.Run("cancels the mark keeping the original hour", func(t *testing.T) {
		f := newTimeEntryFixture()
		punch := f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")

		entry, err := f.service.Void(context.Background(), "e1", punch.ID, timeEntryManager, "Marca duplicada")
		if err != nil {
			t.Fatal(err)
		}

		voided := f.repo.rows[1]
		if voided.Action != domain.TimeEntryVoidedAction || !voided.OccurredAt.Equal(punch.OccurredAt) || *voided.SupersedesID != punch.ID {
			t.Fatalf("row = %+v", voided)
		}
		if !entry.Voided || f.events.events[0].(domain.TimeEntryVoided).Reason != "Marca duplicada" {
			t.Fatalf("entry = %+v", entry)
		}
	})

	t.Run("refuses to strand the clock out", func(t *testing.T) {
		f := newTimeEntryFixture()
		in := f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")
		f.punch("worker", domain.TimeEntryClockOut, "2026-08-08T16:00:00Z", "2026-08-08")

		_, err := f.service.Void(context.Background(), "e1", in.ID, timeEntryManager, "Marca duplicada")
		if !domain.HasCode(err, domain.CodeInvalidClockSequence) || len(f.repo.rows) != 2 {
			t.Fatalf("err = %v", err)
		}
	})

	t.Run("refuses a mark already voided", func(t *testing.T) {
		f := newTimeEntryFixture()
		punch := f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")
		f.service.Void(context.Background(), "e1", punch.ID, timeEntryManager, "Marca duplicada")
		voidedID := f.repo.rows[1].ID

		_, err := f.service.Void(context.Background(), "e1", voidedID, timeEntryManager, "Otra vez")
		if !domain.HasCode(err, domain.CodeTimeEntryNotCurrent) {
			t.Fatalf("err = %v", err)
		}
	})
}

func TestTimeEntryServiceWorkdays(t *testing.T) {
	f := newTimeEntryFixture()
	ctx := context.Background()
	f.repo.addMember("ana", "ana", domain.EstablishmentRoleStaff)

	f.shifts.shifts = []domain.Shift{
		{ID: "s1", EstablishmentID: "e1", UserID: "worker", UserName: "Luis",
			StartTime: domain.NewInstant(timeEntryAt("2026-08-08T06:00:00Z")), EndTime: domain.NewInstant(timeEntryAt("2026-08-08T14:00:00Z"))},
		{ID: "s2", EstablishmentID: "e1", UserID: "manager", UserName: "Marta",
			StartTime: domain.NewInstant(timeEntryAt("2026-08-08T06:00:00Z")), EndTime: domain.NewInstant(timeEntryAt("2026-08-08T10:00:00Z"))},
	}
	f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T06:00:00Z", "2026-08-08")
	f.punch("ana", domain.TimeEntryClockIn, "2026-08-08T07:00:00Z", "2026-08-08")
	f.punch("worker", domain.TimeEntryClockIn, "2026-08-07T06:00:00Z", "2026-08-07")
	f.punch("worker", domain.TimeEntryClockOut, "2026-08-07T14:00:00Z", "2026-08-07")

	workdays, err := f.service.Workdays(ctx, "e1", "2026-08-07", "2026-08-08", "")
	if err != nil {
		t.Fatal(err)
	}

	var got []string
	for _, day := range workdays {
		got = append(got, day.Date+" "+day.UserName+" "+string(day.State))
	}
	want := []string{"2026-08-08 ana IN", "2026-08-08 Luis IN", "2026-08-08 Marta OUT", "2026-08-07 Luis OUT"}
	if !slices.Equal(got, want) {
		t.Fatalf("workdays = %v, want %v", got, want)
	}

	noShow := workdays[2]
	if noShow.PlannedMinutes == nil || *noShow.PlannedMinutes != 240 || !slices.Equal(noShow.Discrepancies, []domain.WorkdayDiscrepancy{domain.DiscrepancyNoShow}) ||
		noShow.Entries == nil || len(noShow.Entries) != 0 {
		t.Fatalf("the day nobody punched = %+v", noShow)
	}
	if workdays[0].PlannedMinutes != nil || !slices.Equal(workdays[0].Discrepancies, []domain.WorkdayDiscrepancy{domain.DiscrepancyUnplanned}) {
		t.Fatalf("the day off the rota = %+v", workdays[0])
	}
	if workdays[1].WorkedMinutes != 240 || workdays[1].PlannedStart == nil || !workdays[1].PlannedStart.Equal(timeEntryAt("2026-08-08T06:00:00Z")) {
		t.Fatalf("the day on the rota = %+v", workdays[1])
	}

	mine, err := f.service.Workdays(ctx, "e1", "2026-08-08", "2026-08-08", "manager")
	if err != nil || len(mine) != 1 || mine[0].UserID != "manager" {
		t.Fatalf("one worker's day = %+v, %v", mine, err)
	}

	for _, dates := range [][2]string{{"2026-08-09", "2026-08-08"}, {"8/8/2026", "2026-08-08"}} {
		if _, err := f.service.Workdays(ctx, "e1", dates[0], dates[1], ""); !domain.HasCode(err, domain.CodeInvalidDate) {
			t.Errorf("Workdays(%v) = %v, want INVALID_DATE", dates, err)
		}
	}
}

func TestTimeEntryServiceTimeSheetDefaultsToToday(t *testing.T) {
	f := newTimeEntryFixture()
	f.now = timeEntryAt("2026-08-08T23:30:00Z")
	f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T23:00:00Z", "2026-08-09")

	workdays, err := f.service.TimeSheet(context.Background(), "e1", nil, nil, "worker")
	if err != nil || len(workdays) != 1 || workdays[0].Date != "2026-08-09" {
		t.Fatalf("workdays = %+v, %v", workdays, err)
	}

	from := "2026-08-08"
	workdays, err = f.service.TimeSheet(context.Background(), "e1", &from, nil, "worker")
	if err != nil || len(workdays) != 0 {
		t.Fatalf("to defaults to from: %+v, %v", workdays, err)
	}
}

func TestTimeEntryServiceCurrentWorkday(t *testing.T) {
	ctx := context.Background()

	f := newTimeEntryFixture()
	if current, err := f.service.CurrentWorkday(ctx, "e1", "worker"); err != nil || current != nil {
		t.Fatalf("nothing punched = %+v, %v", current, err)
	}

	f.punch("worker", domain.TimeEntryClockIn, "2026-08-05T08:00:00Z", "2026-08-05")
	current, err := f.service.CurrentWorkday(ctx, "e1", "worker")
	if err != nil || current == nil || current.Date != "2026-08-05" || current.State != domain.ClockIn {
		t.Fatalf("the running day = %+v, %v", current, err)
	}

	f.punch("worker", domain.TimeEntryClockOut, "2026-08-05T16:00:00Z", "2026-08-05")
	if current, err := f.service.CurrentWorkday(ctx, "e1", "worker"); err != nil || current != nil {
		t.Fatalf("closed day, nothing today = %+v, %v", current, err)
	}
}

func TestTimeEntryServiceIntegrity(t *testing.T) {
	f := newTimeEntryFixture()

	integrity, err := f.service.Integrity(context.Background(), "e1")
	if err != nil || !integrity.Valid || integrity.CheckedEntries != 0 || integrity.BrokenAt != nil {
		t.Fatalf("empty chain = %+v, %v", integrity, err)
	}

	f.punch("worker", domain.TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08")
	integrity, err = f.service.Integrity(context.Background(), "e1")
	if err != nil || integrity.Valid || *integrity.BrokenAt != "entry-1" || integrity.EstablishmentID != "e1" {
		t.Fatalf("a row without hashes = %+v, %v", integrity, err)
	}
}

func TestTimeEntryServiceAudit(t *testing.T) {
	entry := domain.TimeEntry{
		RootID: "root-1", UserID: "worker", UserName: "Luis", WorkdayDate: "2026-08-08", Type: domain.TimeEntryClockIn,
		OccurredAt: domain.NewTime(timeEntryAt("2026-08-08T07:00:00Z")), Source: domain.TimeEntryManual,
	}
	onDevice := entry
	onDevice.Source = domain.TimeEntryFromEmployeeDevice
	reason := "Olvidó fichar"

	tests := []struct {
		name     string
		event    ports.Event
		action   string
		previous string
	}{
		{"an amendment by a platform admin", domain.TimeEntryAmended{EstablishmentID: "e1", Entry: entry, PreviousOccurredAt: "2026-08-08T08:00:00.000Z", ActorID: "admin", ActorRole: domain.RoleAdmin, Reason: reason}, domain.AuditTimeEntryAmended, "2026-08-08T08:00:00.000Z"},
		{"a mark voided by a platform admin", domain.TimeEntryVoided{EstablishmentID: "e1", Entry: entry, ActorID: "admin", ActorRole: domain.RoleAdmin, Reason: reason}, domain.AuditTimeEntryVoided, ""},
		{"a manual entry by a platform admin", domain.TimeEntryRecorded{EstablishmentID: "e1", Entry: entry, ActorID: "admin", ActorRole: domain.RoleAdmin, Reason: &reason}, domain.AuditTimeEntryCreated, ""},
		{"an timeEntryAdmin simply clocking in", domain.TimeEntryRecorded{EstablishmentID: "e1", Entry: onDevice, ActorID: "admin", ActorRole: domain.RoleAdmin}, "", ""},
		{"an establishment manager", domain.TimeEntryAmended{EstablishmentID: "e1", Entry: entry, ActorID: "manager", ActorRole: domain.RoleUser, Reason: reason}, "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newTimeEntryFixture()

			f.service.Audit(context.Background(), tt.event)

			if tt.action == "" {
				if len(f.repo.audits) != 0 {
					t.Fatalf("audits = %+v, want none", f.repo.audits)
				}
				return
			}

			if len(f.repo.audits) != 1 {
				t.Fatalf("audits = %+v", f.repo.audits)
			}
			audit := f.repo.audits[0]
			if audit.Action != tt.action || audit.ActorID != "admin" || audit.TargetID != "root-1" ||
				audit.TargetLabel != "Luis · 2026-08-08" || *audit.Reason != reason {
				t.Fatalf("audit = %+v", audit)
			}
			metadata := audit.Metadata
			if metadata.EstablishmentID != "e1" || metadata.UserID != "worker" || metadata.Type != domain.TimeEntryClockIn {
				t.Fatalf("metadata = %+v", metadata)
			}
			if (tt.previous == "") != (metadata.PreviousOccurredAt == nil) ||
				(tt.previous != "" && *metadata.PreviousOccurredAt != tt.previous) {
				t.Fatalf("previousOccurredAt = %v, want %q", metadata.PreviousOccurredAt, tt.previous)
			}
		})
	}
}
