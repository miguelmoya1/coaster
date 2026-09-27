package domain

import (
	"cmp"
	"slices"
	"time"
)

// TimeEntryType is the kind of punch.
type TimeEntryType string

const (
	TimeEntryClockIn    TimeEntryType = "CLOCK_IN"
	TimeEntryBreakStart TimeEntryType = "BREAK_START"
	TimeEntryBreakEnd   TimeEntryType = "BREAK_END"
	TimeEntryClockOut   TimeEntryType = "CLOCK_OUT"
)

// TimeEntryAction says whether a row is a punch, a correction of one or its cancellation.
type TimeEntryAction string

const (
	TimeEntryRecordedAction TimeEntryAction = "RECORDED"
	TimeEntryAmendedAction  TimeEntryAction = "AMENDED"
	TimeEntryVoidedAction   TimeEntryAction = "VOIDED"
)

// TimeEntrySource says who made the punch: the worker's device or a manager by hand.
type TimeEntrySource string

const (
	TimeEntryFromEmployeeDevice TimeEntrySource = "EMPLOYEE_DEVICE"
	TimeEntryManual             TimeEntrySource = "MANUAL"
)

// ClockState is where a worker stands in their workday.
type ClockState string

const (
	ClockOut     ClockState = "OUT"
	ClockIn      ClockState = "IN"
	ClockOnBreak ClockState = "ON_BREAK"
)

// WorkdayDiscrepancy is a way a workday differs from the rota.
type WorkdayDiscrepancy string

const (
	DiscrepancyNoShow      WorkdayDiscrepancy = "NO_SHOW"
	DiscrepancyUnplanned   WorkdayDiscrepancy = "UNPLANNED"
	DiscrepancyLateStart   WorkdayDiscrepancy = "LATE_START"
	DiscrepancyEarlyFinish WorkdayDiscrepancy = "EARLY_FINISH"
	DiscrepancyOvertime    WorkdayDiscrepancy = "OVERTIME"
)

// TimeEntrySnapshot is who the worker was when the punch was made (userSnapshot).
type TimeEntrySnapshot struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// TimeEntryRow is one row of "TimeEntry": a punch or a revision of one, with the names of
// the worker and of whoever wrote it.
type TimeEntryRow struct {
	ID              string
	EstablishmentID string
	UserID          string
	UserName        string
	UserSnapshot    TimeEntrySnapshot
	ShiftID         *string
	Type            TimeEntryType
	Action          TimeEntryAction
	OccurredAt      time.Time
	RecordedAt      time.Time
	WorkdayDate     time.Time
	Source          TimeEntrySource
	Latitude        *float64
	Longitude       *float64
	RootID          string
	SupersedesID    *string
	ActorID         string
	ActorName       *string
	Reason          *string
	Sequence        int64
	PrevHash        string
	Hash            string
	// SupersededByID is the revision that replaced this row, if any. Only FindCurrentByID fills it.
	SupersededByID *string
}

// AppendTimeEntry is a new row for the chain. The repository adds the id, the sequence,
// the time it was recorded and the hashes.
type AppendTimeEntry struct {
	EstablishmentID string
	UserID          string
	UserSnapshot    TimeEntrySnapshot
	Type            TimeEntryType
	Action          TimeEntryAction
	OccurredAt      time.Time
	WorkdayDate     time.Time
	Source          TimeEntrySource
	ActorID         string
	// RootID is the first row of the punch; empty for a new punch, which is its own root.
	RootID       string
	SupersedesID *string
	Reason       *string
	Latitude     *float64
	Longitude    *float64
}

// TimeEntryMember is a live member of the establishment, as time tracking needs it.
type TimeEntryMember struct {
	UserID string
	Name   string
	Email  string
	Role   EstablishmentRole
}

// TimeEntryRevision is one row of a punch's history (TimeEntryRevision in @coaster/common).
type TimeEntryRevision struct {
	ID         string          `json:"id"`
	Action     TimeEntryAction `json:"action"`
	Type       TimeEntryType   `json:"type"`
	OccurredAt Time            `json:"occurredAt"`
	RecordedAt Time            `json:"recordedAt"`
	Source     TimeEntrySource `json:"source"`
	ActorID    string          `json:"actorId"`
	ActorName  *string         `json:"actorName"`
	Reason     *string         `json:"reason"`
	Hash       string          `json:"hash"`
}

// TimeEntry is a punch with its whole history, as the API sends it (TimeEntry in
// @coaster/common). Its values are those of the latest revision.
type TimeEntry struct {
	ID              string              `json:"id"`
	RootID          string              `json:"rootId"`
	EstablishmentID string              `json:"establishmentId"`
	UserID          string              `json:"userId"`
	UserName        string              `json:"userName"`
	Type            TimeEntryType       `json:"type"`
	OccurredAt      Time                `json:"occurredAt"`
	RecordedAt      Time                `json:"recordedAt"`
	WorkdayDate     string              `json:"workdayDate"`
	Source          TimeEntrySource     `json:"source"`
	Amended         bool                `json:"amended"`
	Voided          bool                `json:"voided"`
	Latitude        *float64            `json:"latitude,omitempty"`
	Longitude       *float64            `json:"longitude,omitempty"`
	ShiftID         *string             `json:"shiftId,omitempty"`
	Revisions       []TimeEntryRevision `json:"revisions"`
}

// Workday is a worker's day on the timesheet (Workday in @coaster/common).
type Workday struct {
	Date           string               `json:"date"`
	UserID         string               `json:"userId"`
	UserName       string               `json:"userName"`
	State          ClockState           `json:"state"`
	WorkedMinutes  int                  `json:"workedMinutes"`
	BreakMinutes   int                  `json:"breakMinutes"`
	PlannedMinutes *int                 `json:"plannedMinutes"`
	PlannedStart   *Time                `json:"plannedStart"`
	PlannedEnd     *Time                `json:"plannedEnd"`
	Discrepancies  []WorkdayDiscrepancy `json:"discrepancies"`
	Entries        []TimeEntry          `json:"entries"`
}

// TimeSheetIntegrity says whether the chain of an establishment's punches is intact.
type TimeSheetIntegrity struct {
	EstablishmentID string  `json:"establishmentId"`
	CheckedEntries  int     `json:"checkedEntries"`
	Valid           bool    `json:"valid"`
	BrokenAt        *string `json:"brokenAt"`
}

// ToTimeEntry joins the rows of one punch into the punch (TimeEntriesMapper.toDomain).
// rows must not be empty.
func ToTimeEntry(rows []TimeEntryRow) TimeEntry {
	ordered := slices.Clone(rows)
	slices.SortStableFunc(ordered, func(a, b TimeEntryRow) int { return cmp.Compare(a.Sequence, b.Sequence) })

	original := ordered[0]
	head := ordered[len(ordered)-1]

	revisions := make([]TimeEntryRevision, 0, len(ordered))
	for _, row := range ordered {
		revisions = append(revisions, TimeEntryRevision{
			ID:         row.ID,
			Action:     row.Action,
			Type:       row.Type,
			OccurredAt: NewTime(row.OccurredAt),
			RecordedAt: NewTime(row.RecordedAt),
			Source:     row.Source,
			ActorID:    row.ActorID,
			ActorName:  row.ActorName,
			Reason:     row.Reason,
			Hash:       row.Hash,
		})
	}

	return TimeEntry{
		ID:              head.ID,
		RootID:          head.RootID,
		EstablishmentID: head.EstablishmentID,
		UserID:          head.UserID,
		UserName:        head.UserName,
		Type:            head.Type,
		OccurredAt:      NewTime(head.OccurredAt),
		RecordedAt:      NewTime(head.RecordedAt),
		WorkdayDate:     FormatWorkdayDate(head.WorkdayDate),
		Source:          head.Source,
		Amended:         len(ordered) > 1,
		Voided:          head.Action == TimeEntryVoidedAction,
		Latitude:        original.Latitude,
		Longitude:       original.Longitude,
		ShiftID:         original.ShiftID,
		Revisions:       revisions,
	}
}

// GroupByRoot turns rows into punches, in the order they happened (TimeEntriesMapper.groupByRoot).
func GroupByRoot(rows []TimeEntryRow) []TimeEntry {
	var roots []string
	groups := make(map[string][]TimeEntryRow)

	for _, row := range rows {
		if _, seen := groups[row.RootID]; !seen {
			roots = append(roots, row.RootID)
		}
		groups[row.RootID] = append(groups[row.RootID], row)
	}

	entries := make([]TimeEntry, 0, len(roots))
	for _, root := range roots {
		entries = append(entries, ToTimeEntry(groups[root]))
	}

	slices.SortStableFunc(entries, func(a, b TimeEntry) int { return a.OccurredAt.Compare(b.OccurredAt.Time) })

	return entries
}
