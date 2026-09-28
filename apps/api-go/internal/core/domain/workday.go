package domain

import (
	"math"
	"slices"
	"time"
	_ "time/tzdata" // the establishment's zone must load even where the system has no zone files
)

// EstablishmentTimeZone is the zone every establishment's workday is counted in.
const EstablishmentTimeZone = "Europe/Madrid"

var establishmentLocation = mustLoadLocation(EstablishmentTimeZone)

func mustLoadLocation(name string) *time.Location {
	location, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return location
}

func InEstablishmentZone(instant time.Time) time.Time {
	return instant.In(establishmentLocation)
}

// workdayLayout is how a workday is written: "2026-08-08".
const workdayLayout = "2006-01-02"

// discrepancyToleranceMinutes is how far a day can stray from the rota before it counts.
const discrepancyToleranceMinutes = 10

var clockTransitions = map[ClockState]map[TimeEntryType]ClockState{
	ClockOut:     {TimeEntryClockIn: ClockIn},
	ClockIn:      {TimeEntryBreakStart: ClockOnBreak, TimeEntryClockOut: ClockOut},
	ClockOnBreak: {TimeEntryBreakEnd: ClockIn, TimeEntryClockOut: ClockOut},
}

// NextClockState is where a punch takes the worker, and false when it makes no sense there.
func NextClockState(state ClockState, punch TimeEntryType) (ClockState, bool) {
	next, ok := clockTransitions[state][punch]
	return next, ok
}

// ReplayClockState plays the punches from the start of a day, and false as soon as one of
// them does not fit.
func ReplayClockState(punches []TimeEntryType) (ClockState, bool) {
	state := ClockOut
	for _, punch := range punches {
		next, ok := NextClockState(state, punch)
		if !ok {
			return "", false
		}
		state = next
	}
	return state, true
}

// WorkdayDateOf is the date the establishment is on at that instant ("2026-08-09").
func WorkdayDateOf(instant time.Time) string {
	return instant.In(establishmentLocation).Format(workdayLayout)
}

// StartOfEstablishmentDay is midnight in the establishment's zone on the day of instant.
func StartOfEstablishmentDay(instant time.Time) time.Time {
	local := instant.In(establishmentLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, establishmentLocation)
}

// FormatWorkdayDate writes a workday date (a UTC midnight) as "2026-08-08".
func FormatWorkdayDate(date time.Time) string {
	return date.UTC().Format(workdayLayout)
}

// ParseWorkdayDate reads "2026-08-08" as that day's UTC midnight, the way it is stored.
func ParseWorkdayDate(date string) (time.Time, bool) {
	parsed, err := time.Parse(workdayLayout, date)
	return parsed, err == nil
}

// ToWorkdayDate is the workday (a UTC midnight) the establishment is on at that instant.
func ToWorkdayDate(instant time.Time) time.Time {
	date, _ := ParseWorkdayDate(WorkdayDateOf(instant))
	return date
}

// ShiftWorkdayDate moves a workday date by a number of days.
func ShiftWorkdayDate(date time.Time, days int) time.Time {
	return date.AddDate(0, 0, days)
}

// ClockMark is a punch as the workday rules see it.
type ClockMark struct {
	Type        TimeEntryType
	OccurredAt  time.Time
	WorkdayDate string
}

// WorkdayTotals is where a day stands and how long was worked and rested.
type WorkdayTotals struct {
	State         ClockState
	WorkedMinutes int
	BreakMinutes  int
}

// PlannedShift is what the rota says about a day.
type PlannedShift struct {
	StartsAt time.Time
	EndsAt   time.Time
	Minutes  int
}

func sortedByOccurredAt(marks []ClockMark) []ClockMark {
	sorted := slices.Clone(marks)
	slices.SortStableFunc(sorted, func(a, b ClockMark) int { return a.OccurredAt.Compare(b.OccurredAt) })
	return sorted
}

// roundMinutes is Math.round(ms / 60000).
func roundMinutes(d time.Duration) int {
	return int(math.Floor(float64(d.Milliseconds())/60_000 + 0.5))
}

// SummariseWorkday adds up a day's marks. A day still open counts up to now. It returns
// false when the marks do not make a valid day.
func SummariseWorkday(marks []ClockMark, now time.Time) (WorkdayTotals, bool) {
	state := ClockOut
	var since *time.Time
	var worked, rested time.Duration

	for _, mark := range sortedByOccurredAt(marks) {
		next, ok := NextClockState(state, mark.Type)
		if !ok {
			return WorkdayTotals{}, false
		}

		if since != nil {
			elapsed := mark.OccurredAt.Sub(*since)
			switch state {
			case ClockIn:
				worked += elapsed
			case ClockOnBreak:
				rested += elapsed
			}
		}

		state = next
		occurredAt := mark.OccurredAt
		since = &occurredAt
	}

	if since != nil && state != ClockOut {
		elapsed := max(0, now.Sub(*since))
		if state == ClockIn {
			worked += elapsed
		} else {
			rested += elapsed
		}
	}

	return WorkdayTotals{State: state, WorkedMinutes: roundMinutes(worked), BreakMinutes: roundMinutes(rested)}, true
}

func stateOf(marks []ClockMark) (ClockState, bool) {
	var punches []TimeEntryType
	for _, mark := range sortedByOccurredAt(marks) {
		punches = append(punches, mark.Type)
	}
	return ReplayClockState(punches)
}

// IsValidSequence reports whether the marks, in time order, make a valid day.
func IsValidSequence(marks []ClockMark) bool {
	_, ok := stateOf(marks)
	return ok
}

// IsDayOpen reports whether the marks leave the worker in (or on a break).
func IsDayOpen(marks []ClockMark) bool {
	state, ok := stateOf(marks)
	return ok && state != ClockOut
}

// daysIn lists the workdays of the marks, latest first.
func daysIn(marks []ClockMark) []string {
	var days []string
	for _, mark := range marks {
		if !slices.Contains(days, mark.WorkdayDate) {
			days = append(days, mark.WorkdayDate)
		}
	}
	slices.Sort(days)
	slices.Reverse(days)
	return days
}

func marksOfDay(marks []ClockMark, day string) []ClockMark {
	var found []ClockMark
	for _, mark := range marks {
		if mark.WorkdayDate == day {
			found = append(found, mark)
		}
	}
	return found
}

// dayStillOpenAt is the latest day still open whose marks all came before occurredAt.
func dayStillOpenAt(marks []ClockMark, occurredAt time.Time) (string, bool) {
	for _, day := range daysIn(marks) {
		ofDay := marksOfDay(marks, day)
		allBefore := !slices.ContainsFunc(ofDay, func(mark ClockMark) bool { return mark.OccurredAt.After(occurredAt) })

		if IsDayOpen(ofDay) && allBefore {
			return day, true
		}
	}
	return "", false
}

// PlanMark says which workday a new punch belongs to: the day still open, or the
// establishment's date of the punch. It returns false when the punch does not fit that day.
func PlanMark(punch TimeEntryType, occurredAt time.Time, candidates []ClockMark) (time.Time, bool) {
	day, open := dayStillOpenAt(candidates, occurredAt)
	if !open {
		day = WorkdayDateOf(occurredAt)
	}

	marks := append(marksOfDay(candidates, day), ClockMark{Type: punch, OccurredAt: occurredAt})
	if !IsValidSequence(marks) {
		return time.Time{}, false
	}

	return ParseWorkdayDate(day)
}

// ToClockMarks turns punches into marks, leaving out the voided ones.
func ToClockMarks(entries []TimeEntry) []ClockMark {
	var marks []ClockMark
	for _, entry := range entries {
		if entry.Voided {
			continue
		}
		marks = append(marks, ClockMark{Type: entry.Type, OccurredAt: entry.OccurredAt.Time, WorkdayDate: entry.WorkdayDate})
	}
	return marks
}

func minutesBetween(from, to time.Time) float64 {
	return float64(to.Sub(from).Milliseconds()) / 60_000
}

// FindDiscrepancies compares a day's marks with the rota. planned is nil when nothing was
// on the rota.
func FindDiscrepancies(marks []ClockMark, planned *PlannedShift, workedMinutes int) []WorkdayDiscrepancy {
	worked := sortedByOccurredAt(marks)
	found := []WorkdayDiscrepancy{}

	if planned == nil {
		if len(worked) > 0 {
			return []WorkdayDiscrepancy{DiscrepancyUnplanned}
		}
		return found
	}

	if len(worked) == 0 {
		return []WorkdayDiscrepancy{DiscrepancyNoShow}
	}

	if minutesBetween(planned.StartsAt, worked[0].OccurredAt) > discrepancyToleranceMinutes {
		found = append(found, DiscrepancyLateStart)
	}

	for i := len(worked) - 1; i >= 0; i-- {
		if worked[i].Type == TimeEntryClockOut {
			if minutesBetween(worked[i].OccurredAt, planned.EndsAt) > discrepancyToleranceMinutes {
				found = append(found, DiscrepancyEarlyFinish)
			}
			break
		}
	}

	if workedMinutes-planned.Minutes > discrepancyToleranceMinutes {
		found = append(found, DiscrepancyOvertime)
	}

	return found
}
