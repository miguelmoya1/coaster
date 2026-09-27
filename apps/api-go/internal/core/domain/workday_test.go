package domain

import (
	"slices"
	"testing"
	"time"
)

func at(iso string) time.Time {
	parsed, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		panic(err)
	}
	return parsed
}

func mark(punch TimeEntryType, iso string) ClockMark {
	return ClockMark{Type: punch, OccurredAt: at(iso), WorkdayDate: "2026-08-08"}
}

func markOn(punch TimeEntryType, iso, workday string) ClockMark {
	return ClockMark{Type: punch, OccurredAt: at(iso), WorkdayDate: workday}
}

func TestNextClockState(t *testing.T) {
	tests := []struct {
		from  ClockState
		punch TimeEntryType
		want  ClockState
		ok    bool
	}{
		{ClockOut, TimeEntryClockIn, ClockIn, true},
		{ClockIn, TimeEntryBreakStart, ClockOnBreak, true},
		{ClockOnBreak, TimeEntryBreakEnd, ClockIn, true},
		{ClockIn, TimeEntryClockOut, ClockOut, true},
		{ClockOnBreak, TimeEntryClockOut, ClockOut, true},
		{ClockOut, TimeEntryClockOut, "", false},
		{ClockOut, TimeEntryBreakStart, "", false},
		{ClockIn, TimeEntryClockIn, "", false},
		{ClockOnBreak, TimeEntryBreakStart, "", false},
	}

	for _, tt := range tests {
		got, ok := NextClockState(tt.from, tt.punch)
		if got != tt.want || ok != tt.ok {
			t.Errorf("NextClockState(%s, %s) = %s, %v; want %s, %v", tt.from, tt.punch, got, ok, tt.want, tt.ok)
		}
	}
}

func TestReplayClockState(t *testing.T) {
	tests := []struct {
		name    string
		punches []TimeEntryType
		want    ClockState
		ok      bool
	}{
		{"nothing punched", nil, ClockOut, true},
		{"whole day", []TimeEntryType{TimeEntryClockIn, TimeEntryBreakStart, TimeEntryBreakEnd, TimeEntryClockOut}, ClockOut, true},
		{"still in", []TimeEntryType{TimeEntryClockIn}, ClockIn, true},
		{"still on a break", []TimeEntryType{TimeEntryClockIn, TimeEntryBreakStart}, ClockOnBreak, true},
		{"two clock ins", []TimeEntryType{TimeEntryClockIn, TimeEntryClockIn}, "", false},
		{"break end first", []TimeEntryType{TimeEntryBreakEnd}, "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ReplayClockState(tt.punches)
			if got != tt.want || ok != tt.ok {
				t.Errorf("got %s, %v; want %s, %v", got, ok, tt.want, tt.ok)
			}
		})
	}
}

func TestWorkdayDateOf(t *testing.T) {
	tests := []struct {
		instant string
		want    string
	}{
		{"2026-08-08T23:30:00Z", "2026-08-09"},
		{"2026-08-08T12:00:00Z", "2026-08-08"},
		{"2026-08-09T01:00:00Z", "2026-08-09"},
		{"2026-01-15T23:30:00Z", "2026-01-16"},
		{"2026-01-15T22:30:00Z", "2026-01-15"},
	}

	for _, tt := range tests {
		if got := WorkdayDateOf(at(tt.instant)); got != tt.want {
			t.Errorf("WorkdayDateOf(%s) = %s, want %s", tt.instant, got, tt.want)
		}
	}
}

func TestStartOfEstablishmentDay(t *testing.T) {
	got := StartOfEstablishmentDay(at("2026-08-08T23:30:00Z"))
	if !got.Equal(at("2026-08-08T22:00:00Z")) {
		t.Errorf("summer: got %s", got.UTC())
	}

	got = StartOfEstablishmentDay(at("2026-01-15T10:00:00Z"))
	if !got.Equal(at("2026-01-14T23:00:00Z")) {
		t.Errorf("winter: got %s", got.UTC())
	}
}

func TestSummariseWorkday(t *testing.T) {
	tests := []struct {
		name  string
		marks []ClockMark
		now   string
		want  WorkdayTotals
		ok    bool
	}{
		{
			name: "discounts the break from the worked time",
			marks: []ClockMark{
				mark(TimeEntryClockIn, "2026-08-08T08:00:00Z"),
				mark(TimeEntryBreakStart, "2026-08-08T11:00:00Z"),
				mark(TimeEntryBreakEnd, "2026-08-08T11:30:00Z"),
				mark(TimeEntryClockOut, "2026-08-08T16:00:00Z"),
			},
			now:  "2026-08-08T20:00:00Z",
			want: WorkdayTotals{State: ClockOut, WorkedMinutes: 450, BreakMinutes: 30},
			ok:   true,
		},
		{
			name:  "keeps counting an open shift up to now",
			marks: []ClockMark{mark(TimeEntryClockIn, "2026-08-08T08:00:00Z")},
			now:   "2026-08-08T10:00:00Z",
			want:  WorkdayTotals{State: ClockIn, WorkedMinutes: 120},
			ok:    true,
		},
		{
			name: "counts time on an open break as break",
			marks: []ClockMark{
				mark(TimeEntryClockIn, "2026-08-08T08:00:00Z"),
				mark(TimeEntryBreakStart, "2026-08-08T09:00:00Z"),
			},
			now:  "2026-08-08T09:30:00Z",
			want: WorkdayTotals{State: ClockOnBreak, WorkedMinutes: 60, BreakMinutes: 30},
			ok:   true,
		},
		{
			name: "clocks out straight from a break",
			marks: []ClockMark{
				mark(TimeEntryClockIn, "2026-08-08T08:00:00Z"),
				mark(TimeEntryBreakStart, "2026-08-08T09:00:00Z"),
				mark(TimeEntryClockOut, "2026-08-08T09:30:00Z"),
			},
			now:  "2026-08-08T12:00:00Z",
			want: WorkdayTotals{State: ClockOut, WorkedMinutes: 60, BreakMinutes: 30},
			ok:   true,
		},
		{
			name:  "rejects a day that starts with a clock out",
			marks: []ClockMark{mark(TimeEntryClockOut, "2026-08-08T16:00:00Z")},
			now:   "2026-08-08T20:00:00Z",
		},
		{
			name: "rejects two clock ins in a row",
			marks: []ClockMark{
				mark(TimeEntryClockIn, "2026-08-08T08:00:00Z"),
				mark(TimeEntryClockIn, "2026-08-08T09:00:00Z"),
			},
			now: "2026-08-08T12:00:00Z",
		},
		{
			name: "reads marks in time order",
			marks: []ClockMark{
				mark(TimeEntryClockOut, "2026-08-08T16:00:00Z"),
				mark(TimeEntryClockIn, "2026-08-08T08:00:00Z"),
			},
			now:  "2026-08-08T20:00:00Z",
			want: WorkdayTotals{State: ClockOut, WorkedMinutes: 480},
			ok:   true,
		},
		{
			name:  "keeps counting a day nobody closed",
			marks: []ClockMark{mark(TimeEntryClockIn, "2026-08-08T08:00:00Z")},
			now:   "2026-08-11T08:00:00Z",
			want:  WorkdayTotals{State: ClockIn, WorkedMinutes: 3 * 24 * 60},
			ok:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := SummariseWorkday(tt.marks, at(tt.now))
			if got != tt.want || ok != tt.ok {
				t.Errorf("got %+v, %v; want %+v, %v", got, ok, tt.want, tt.ok)
			}
		})
	}
}

func TestPlanMark(t *testing.T) {
	tests := []struct {
		name       string
		punch      TimeEntryType
		occurredAt string
		candidates []ClockMark
		want       string
	}{
		{"opens the day on the date of the clock in", TimeEntryClockIn, "2026-08-08T08:00:00Z", nil, "2026-08-08"},
		{"refuses a break before clocking in", TimeEntryBreakStart, "2026-08-08T08:00:00Z", nil, ""},
		{
			"keeps a night shift on the day it started", TimeEntryClockOut, "2026-08-09T02:00:00Z",
			[]ClockMark{markOn(TimeEntryClockIn, "2026-08-08T20:00:00Z", "2026-08-08")}, "2026-08-08",
		},
		{
			"starts a fresh day once the previous one is closed", TimeEntryClockIn, "2026-08-09T08:00:00Z",
			[]ClockMark{
				markOn(TimeEntryClockIn, "2026-08-08T20:00:00Z", "2026-08-08"),
				markOn(TimeEntryClockOut, "2026-08-08T22:00:00Z", "2026-08-08"),
			},
			"2026-08-09",
		},
		{
			"closes the day it started however long it ran", TimeEntryClockOut, "2026-08-11T09:00:00Z",
			[]ClockMark{markOn(TimeEntryClockIn, "2026-08-08T20:00:00Z", "2026-08-08")}, "2026-08-08",
		},
		{
			"refuses a second day while one is open", TimeEntryClockIn, "2026-08-09T08:00:00Z",
			[]ClockMark{markOn(TimeEntryClockIn, "2026-08-08T20:00:00Z", "2026-08-08")}, "",
		},
		{
			"lets a second shift start on a closed day", TimeEntryClockIn, "2026-08-08T18:00:00Z",
			[]ClockMark{
				markOn(TimeEntryClockIn, "2026-08-08T08:00:00Z", "2026-08-08"),
				markOn(TimeEntryClockOut, "2026-08-08T12:00:00Z", "2026-08-08"),
			},
			"2026-08-08",
		},
		{
			"ignores an open day whose marks come after", TimeEntryClockIn, "2026-08-08T06:00:00Z",
			[]ClockMark{markOn(TimeEntryClockIn, "2026-08-08T20:00:00Z", "2026-08-08")}, "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := PlanMark(tt.punch, at(tt.occurredAt), tt.candidates)

			if tt.want == "" {
				if ok {
					t.Fatalf("got %s, want a refusal", FormatWorkdayDate(got))
				}
				return
			}
			if !ok || FormatWorkdayDate(got) != tt.want {
				t.Fatalf("got %s, %v; want %s", FormatWorkdayDate(got), ok, tt.want)
			}
		})
	}
}

func TestFindDiscrepancies(t *testing.T) {
	morning := &PlannedShift{StartsAt: at("2026-08-08T08:00:00Z"), EndsAt: at("2026-08-08T16:00:00Z"), Minutes: 480}
	workedDay := func(in, out string) []ClockMark {
		return []ClockMark{mark(TimeEntryClockIn, in), mark(TimeEntryClockOut, out)}
	}

	tests := []struct {
		name    string
		marks   []ClockMark
		planned *PlannedShift
		worked  int
		want    []WorkdayDiscrepancy
	}{
		{"matches the rota", workedDay("2026-08-08T08:00:00Z", "2026-08-08T16:00:00Z"), morning, 480, []WorkdayDiscrepancy{}},
		{"no show", nil, morning, 0, []WorkdayDiscrepancy{DiscrepancyNoShow}},
		{"unplanned", workedDay("2026-08-08T08:00:00Z", "2026-08-08T16:00:00Z"), nil, 480, []WorkdayDiscrepancy{DiscrepancyUnplanned}},
		{"neither rota nor marks", nil, nil, 0, []WorkdayDiscrepancy{}},
		{"late start", workedDay("2026-08-08T09:00:00Z", "2026-08-08T16:00:00Z"), morning, 420, []WorkdayDiscrepancy{DiscrepancyLateStart}},
		{"a few minutes late", workedDay("2026-08-08T08:05:00Z", "2026-08-08T16:00:00Z"), morning, 475, []WorkdayDiscrepancy{}},
		{"early finish", workedDay("2026-08-08T08:00:00Z", "2026-08-08T14:00:00Z"), morning, 360, []WorkdayDiscrepancy{DiscrepancyEarlyFinish}},
		{"still open", []ClockMark{mark(TimeEntryClockIn, "2026-08-08T08:00:00Z")}, morning, 120, []WorkdayDiscrepancy{}},
		{"overtime", workedDay("2026-08-08T08:00:00Z", "2026-08-08T18:00:00Z"), morning, 600, []WorkdayDiscrepancy{DiscrepancyOvertime}},
		{
			"every discrepancy at once", workedDay("2026-08-08T10:00:00Z", "2026-08-08T14:00:00Z"), morning, 240,
			[]WorkdayDiscrepancy{DiscrepancyLateStart, DiscrepancyEarlyFinish},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindDiscrepancies(tt.marks, tt.planned, tt.worked)
			if got == nil || !slices.Equal(got, tt.want) {
				t.Errorf("got %#v, want %v", got, tt.want)
			}
		})
	}
}
