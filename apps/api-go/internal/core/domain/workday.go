package domain

import (
	"math"
	"slices"
	"time"
	_ "time/tzdata"
)

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

const workdayLayout = "2006-01-02"

const discrepancyToleranceMinutes = 10

var clockTransitions = map[ClockState]map[TimeEntryType]ClockState{
	ClockOut:     {TimeEntryClockIn: ClockIn},
	ClockIn:      {TimeEntryBreakStart: ClockOnBreak, TimeEntryClockOut: ClockOut},
	ClockOnBreak: {TimeEntryBreakEnd: ClockIn, TimeEntryClockOut: ClockOut},
}

func NextClockState(state ClockState, punch TimeEntryType) (ClockState, bool) {
	next, ok := clockTransitions[state][punch]
	return next, ok
}

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

func WorkdayDateOf(instant time.Time) string {
	return instant.In(establishmentLocation).Format(workdayLayout)
}

func StartOfEstablishmentDay(instant time.Time) time.Time {
	local := instant.In(establishmentLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, establishmentLocation)
}

func FormatWorkdayDate(date time.Time) string {
	return date.UTC().Format(workdayLayout)
}

func ParseWorkdayDate(date string) (time.Time, bool) {
	parsed, err := time.Parse(workdayLayout, date)
	return parsed, err == nil
}

func ToWorkdayDate(instant time.Time) time.Time {
	date, _ := ParseWorkdayDate(WorkdayDateOf(instant))
	return date
}

func ShiftWorkdayDate(date time.Time, days int) time.Time {
	return date.AddDate(0, 0, days)
}

type ClockMark struct {
	Type        TimeEntryType
	OccurredAt  time.Time
	WorkdayDate string
}

type WorkdayTotals struct {
	State         ClockState
	WorkedMinutes int
	BreakMinutes  int
}

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

func roundMinutes(d time.Duration) int {
	return int(math.Floor(float64(d.Milliseconds())/60_000 + 0.5))
}

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

func IsValidSequence(marks []ClockMark) bool {
	_, ok := stateOf(marks)
	return ok
}

func IsDayOpen(marks []ClockMark) bool {
	state, ok := stateOf(marks)
	return ok && state != ClockOut
}

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
