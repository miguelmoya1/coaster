package service

import (
	"context"
	"log/slog"
	"math"
	"slices"
	"strings"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type TimeEntryService struct {
	entries ports.TimeEntryRepository
	shifts  *ShiftService
	events  ports.EventPublisher
	now     func() time.Time
}

func NewTimeEntryService(entries ports.TimeEntryRepository, shifts *ShiftService, events ports.EventPublisher) *TimeEntryService {
	return &TimeEntryService{entries: entries, shifts: shifts, events: events, now: time.Now}
}

func (s *TimeEntryService) serverNow() time.Time {
	return s.now().UTC().Truncate(time.Millisecond)
}

func (s *TimeEntryService) Clock(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error) {
	occurredAt := s.serverNow()

	rows, err := s.entries.FindLatestWorkday(ctx, establishmentID, actor.ID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	workdayDate, ok := domain.PlanMark(input.Type, occurredAt, domain.ToClockMarks(domain.GroupByRoot(rows)))
	if !ok {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidClockSequence)
	}

	created, err := s.entries.Append(ctx, domain.AppendTimeEntry{
		EstablishmentID: establishmentID,
		UserID:          actor.ID,
		UserSnapshot:    domain.TimeEntrySnapshot{Name: actor.Name, Email: actor.Email},
		Type:            input.Type,
		Action:          domain.TimeEntryRecordedAction,
		OccurredAt:      occurredAt,
		WorkdayDate:     workdayDate,
		Source:          domain.TimeEntryFromEmployeeDevice,
		ActorID:         actor.ID,
		Latitude:        input.Latitude,
		Longitude:       input.Longitude,
	})
	if err != nil {
		return domain.TimeEntry{}, err
	}

	entry := domain.ToTimeEntry([]domain.TimeEntryRow{*created})
	s.events.Publish(ctx, domain.TimeEntryRecorded{
		EstablishmentID: establishmentID,
		Entry:           entry,
		ActorID:         actor.ID,
		ActorRole:       actor.Role,
	})

	return entry, nil
}

func (s *TimeEntryService) CreateManual(ctx context.Context, establishmentID string, actor *domain.User, input domain.ManualTimeEntryInput) (domain.TimeEntry, error) {
	occurredAt, ok := domain.ParseDate(input.OccurredAt)
	if !ok {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidDate)
	}

	member, err := s.entries.FindActiveMember(ctx, establishmentID, input.UserID)
	if err != nil {
		return domain.TimeEntry{}, err
	}
	if member == nil {
		return domain.TimeEntry{}, domain.NotFound(domain.CodeMemberNotFound)
	}

	natural := domain.ToWorkdayDate(occurredAt)
	rows, err := s.entries.FindByWorkdayRange(ctx, establishmentID, domain.ShiftWorkdayDate(natural, -1), natural, input.UserID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	workdayDate, ok := domain.PlanMark(input.Type, occurredAt, domain.ToClockMarks(domain.GroupByRoot(rows)))
	if !ok {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidClockSequence)
	}

	reason := strings.TrimSpace(input.Reason)
	created, err := s.entries.Append(ctx, domain.AppendTimeEntry{
		EstablishmentID: establishmentID,
		UserID:          input.UserID,
		UserSnapshot:    domain.TimeEntrySnapshot{Name: member.Name, Email: member.Email},
		Type:            input.Type,
		Action:          domain.TimeEntryRecordedAction,
		OccurredAt:      occurredAt,
		WorkdayDate:     workdayDate,
		Source:          domain.TimeEntryManual,
		ActorID:         actor.ID,
		Reason:          &reason,
	})
	if err != nil {
		return domain.TimeEntry{}, err
	}

	entry := domain.ToTimeEntry([]domain.TimeEntryRow{*created})
	s.events.Publish(ctx, domain.TimeEntryRecorded{
		EstablishmentID: establishmentID,
		Entry:           entry,
		ActorID:         actor.ID,
		ActorRole:       actor.Role,
		Reason:          &reason,
	})

	return entry, nil
}

func (s *TimeEntryService) currentRow(ctx context.Context, establishmentID, entryID string) (*domain.TimeEntryRow, error) {
	current, err := s.entries.FindCurrentByID(ctx, establishmentID, entryID)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, domain.NotFound(domain.CodeTimeEntryNotFound)
	}
	if current.SupersededByID != nil || current.Action == domain.TimeEntryVoidedAction {
		return nil, domain.BadRequest(domain.CodeTimeEntryNotCurrent)
	}
	return current, nil
}

func (s *TimeEntryService) canManageOthers(ctx context.Context, establishmentID string, actor *domain.User) (bool, error) {
	if actor.Role == domain.RoleAdmin {
		return true, nil
	}

	member, err := s.entries.FindActiveMember(ctx, establishmentID, actor.ID)
	if err != nil || member == nil {
		return false, err
	}

	return domain.HasPermission(member.Role, domain.PermissionManageTimeEntries), nil
}

func (s *TimeEntryService) Amend(ctx context.Context, establishmentID, entryID string, actor *domain.User, input domain.AmendTimeEntryInput) (domain.TimeEntry, error) {
	current, err := s.currentRow(ctx, establishmentID, entryID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	if current.UserID != actor.ID {
		allowed, err := s.canManageOthers(ctx, establishmentID, actor)
		if err != nil {
			return domain.TimeEntry{}, err
		}
		if !allowed {
			return domain.TimeEntry{}, domain.Forbidden(domain.CodeNotYourTimeEntry)
		}
	}

	occurredAt, ok := domain.ParseDate(input.OccurredAt)
	if !ok {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidDate)
	}

	rows, err := s.entries.FindByWorkdayRange(ctx, establishmentID, current.WorkdayDate, current.WorkdayDate, current.UserID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	day := domain.GroupByRoot(rows)
	for i := range day {
		if day[i].RootID == current.RootID {
			day[i].OccurredAt = domain.NewTime(occurredAt)
		}
	}

	if !domain.IsValidSequence(domain.ToClockMarks(day)) {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidClockSequence)
	}

	reason := strings.TrimSpace(input.Reason)
	if _, err := s.entries.Append(ctx, s.revisionOf(current, actor, domain.TimeEntryAmendedAction, occurredAt, reason)); err != nil {
		return domain.TimeEntry{}, err
	}

	entry, err := s.entryOfRoot(ctx, current.RootID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	s.events.Publish(ctx, domain.TimeEntryAmended{
		EstablishmentID:    establishmentID,
		Entry:              entry,
		PreviousOccurredAt: domain.FormatISO(current.OccurredAt),
		ActorID:            actor.ID,
		ActorRole:          actor.Role,
		Reason:             reason,
	})

	return entry, nil
}

func (s *TimeEntryService) Void(ctx context.Context, establishmentID, entryID string, actor *domain.User, reason string) (domain.TimeEntry, error) {
	current, err := s.currentRow(ctx, establishmentID, entryID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	rows, err := s.entries.FindByWorkdayRange(ctx, establishmentID, current.WorkdayDate, current.WorkdayDate, current.UserID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	day := slices.DeleteFunc(domain.GroupByRoot(rows), func(entry domain.TimeEntry) bool { return entry.RootID == current.RootID })
	if !domain.IsValidSequence(domain.ToClockMarks(day)) {
		return domain.TimeEntry{}, domain.BadRequest(domain.CodeInvalidClockSequence)
	}

	reason = strings.TrimSpace(reason)
	if _, err := s.entries.Append(ctx, s.revisionOf(current, actor, domain.TimeEntryVoidedAction, current.OccurredAt, reason)); err != nil {
		return domain.TimeEntry{}, err
	}

	entry, err := s.entryOfRoot(ctx, current.RootID)
	if err != nil {
		return domain.TimeEntry{}, err
	}

	s.events.Publish(ctx, domain.TimeEntryVoided{
		EstablishmentID: establishmentID,
		Entry:           entry,
		ActorID:         actor.ID,
		ActorRole:       actor.Role,
		Reason:          reason,
	})

	return entry, nil
}

func (s *TimeEntryService) revisionOf(current *domain.TimeEntryRow, actor *domain.User, action domain.TimeEntryAction, occurredAt time.Time, reason string) domain.AppendTimeEntry {
	supersedes := current.ID
	return domain.AppendTimeEntry{
		EstablishmentID: current.EstablishmentID,
		UserID:          current.UserID,
		UserSnapshot:    current.UserSnapshot,
		Type:            current.Type,
		Action:          action,
		OccurredAt:      occurredAt,
		WorkdayDate:     current.WorkdayDate,
		Source:          current.Source,
		ActorID:         actor.ID,
		RootID:          current.RootID,
		SupersedesID:    &supersedes,
		Reason:          &reason,
	}
}

func (s *TimeEntryService) entryOfRoot(ctx context.Context, rootID string) (domain.TimeEntry, error) {
	rows, err := s.entries.FindByRoots(ctx, []string{rootID})
	if err != nil {
		return domain.TimeEntry{}, err
	}
	return domain.ToTimeEntry(rows), nil
}

func (s *TimeEntryService) TimeSheet(ctx context.Context, establishmentID string, from, to *string, userID string) ([]domain.Workday, error) {
	today := domain.WorkdayDateOf(s.now())

	first := today
	if from != nil {
		first = *from
	}

	last := first
	if to != nil {
		last = *to
	}

	return s.Workdays(ctx, establishmentID, first, last, userID)
}

type plannedDay struct {
	domain.PlannedShift
	userID   string
	userName string
	date     string
}

func plannedByDay(shifts []domain.Shift) (keys []string, planned map[string]*plannedDay) {
	planned = make(map[string]*plannedDay)

	for _, shift := range shifts {
		startsAt := shift.StartTime.Time
		endsAt := shift.EndTime.Time
		date := domain.WorkdayDateOf(startsAt)
		key := shift.UserID + "|" + date
		minutes := max(0, int(math.Floor(float64(endsAt.Sub(startsAt).Milliseconds())/60_000+0.5)))

		current, found := planned[key]
		if !found {
			keys = append(keys, key)
			planned[key] = &plannedDay{
				PlannedShift: domain.PlannedShift{StartsAt: startsAt, EndsAt: endsAt, Minutes: minutes},
				userID:       shift.UserID,
				userName:     shift.UserName,
				date:         date,
			}
			continue
		}

		current.userName = shift.UserName
		if startsAt.Before(current.StartsAt) {
			current.StartsAt = startsAt
		}
		if endsAt.After(current.EndsAt) {
			current.EndsAt = endsAt
		}
		current.Minutes += minutes
	}

	return keys, planned
}

func (s *TimeEntryService) Workdays(ctx context.Context, establishmentID, from, to, userID string) ([]domain.Workday, error) {
	fromDate, fromOK := domain.ParseWorkdayDate(from)
	toDate, toOK := domain.ParseWorkdayDate(to)
	if !fromOK || !toOK || fromDate.After(toDate) {
		return nil, domain.BadRequest(domain.CodeInvalidDate)
	}

	rows, err := s.entries.FindByWorkdayRange(ctx, establishmentID, fromDate, toDate, userID)
	if err != nil {
		return nil, err
	}

	shifts, err := s.shifts.ListBetween(ctx, establishmentID, fromDate, domain.ShiftWorkdayDate(toDate, 1))
	if err != nil {
		return nil, err
	}
	if userID != "" {
		shifts = slices.DeleteFunc(shifts, func(shift domain.Shift) bool { return shift.UserID != userID })
	}
	plannedKeys, planned := plannedByDay(shifts)

	var dayKeys []string
	days := make(map[string][]domain.TimeEntry)

	for _, entry := range domain.GroupByRoot(rows) {
		key := entry.UserID + "|" + entry.WorkdayDate
		if _, found := days[key]; !found {
			dayKeys = append(dayKeys, key)
		}
		days[key] = append(days[key], entry)
	}

	for _, key := range plannedKeys {
		shift := planned[key]
		if _, found := days[key]; !found && shift.date >= from && shift.date <= to {
			dayKeys = append(dayKeys, key)
			days[key] = []domain.TimeEntry{}
		}
	}

	now := s.now()
	workdays := make([]domain.Workday, 0, len(dayKeys))

	for _, key := range dayKeys {
		entries := days[key]
		marks := domain.ToClockMarks(entries)
		shift := planned[key]

		totals, ok := domain.SummariseWorkday(marks, now)
		if !ok {
			totals = domain.WorkdayTotals{State: domain.ClockOut}
		}

		workday := domain.Workday{
			State:         totals.State,
			WorkedMinutes: totals.WorkedMinutes,
			BreakMinutes:  totals.BreakMinutes,
			Entries:       entries,
		}

		if len(entries) > 0 {
			workday.Date = entries[0].WorkdayDate
			workday.UserID = entries[0].UserID
			workday.UserName = entries[0].UserName
		} else {
			workday.Date = shift.date
			workday.UserID = shift.userID
			workday.UserName = shift.userName
		}

		var plannedShift *domain.PlannedShift
		if shift != nil {
			plannedShift = &shift.PlannedShift
			minutes := shift.Minutes
			start := domain.NewTime(shift.StartsAt)
			end := domain.NewTime(shift.EndsAt)
			workday.PlannedMinutes = &minutes
			workday.PlannedStart = &start
			workday.PlannedEnd = &end
		}

		workday.Discrepancies = domain.FindDiscrepancies(marks, plannedShift, totals.WorkedMinutes)
		workdays = append(workdays, workday)
	}

	slices.SortStableFunc(workdays, func(a, b domain.Workday) int {
		if byDate := strings.Compare(b.Date, a.Date); byDate != 0 {
			return byDate
		}
		return compareNames(a.UserName, b.UserName)
	})

	return workdays, nil
}

func compareNames(a, b string) int {
	if byLower := strings.Compare(strings.ToLower(a), strings.ToLower(b)); byLower != 0 {
		return byLower
	}
	return strings.Compare(b, a)
}

func (s *TimeEntryService) CurrentWorkday(ctx context.Context, establishmentID, userID string) (*domain.Workday, error) {
	rows, err := s.entries.FindLatestWorkday(ctx, establishmentID, userID)
	if err != nil {
		return nil, err
	}

	latest := domain.GroupByRoot(rows)
	date := domain.WorkdayDateOf(s.now())
	if domain.IsDayOpen(domain.ToClockMarks(latest)) {
		date = latest[0].WorkdayDate
	}

	workdays, err := s.Workdays(ctx, establishmentID, date, date, userID)
	if err != nil || len(workdays) == 0 {
		return nil, err
	}

	return &workdays[0], nil
}

func (s *TimeEntryService) Integrity(ctx context.Context, establishmentID string) (domain.TimeSheetIntegrity, error) {
	rows, err := s.entries.FindChain(ctx, establishmentID)
	if err != nil {
		return domain.TimeSheetIntegrity{}, err
	}

	result := domain.VerifyChain(rows)

	return domain.TimeSheetIntegrity{
		EstablishmentID: establishmentID,
		CheckedEntries:  result.Checked,
		Valid:           result.Valid,
		BrokenAt:        result.BrokenAt,
	}, nil
}

func (s *TimeEntryService) Audit(ctx context.Context, event ports.Event) {
	var audit domain.TimeEntryAudit
	var entry domain.TimeEntry
	var role domain.Role
	var establishmentID string
	var previousOccurredAt *string

	switch e := event.(type) {
	case domain.TimeEntryRecorded:
		if e.Entry.Source != domain.TimeEntryManual {
			return
		}
		audit = domain.TimeEntryAudit{ActorID: e.ActorID, Action: domain.AuditTimeEntryCreated, Reason: e.Reason}
		entry, role, establishmentID = e.Entry, e.ActorRole, e.EstablishmentID
	case domain.TimeEntryAmended:
		reason := e.Reason
		previous := e.PreviousOccurredAt
		audit = domain.TimeEntryAudit{ActorID: e.ActorID, Action: domain.AuditTimeEntryAmended, Reason: &reason}
		entry, role, establishmentID = e.Entry, e.ActorRole, e.EstablishmentID
		previousOccurredAt = &previous
	case domain.TimeEntryVoided:
		reason := e.Reason
		audit = domain.TimeEntryAudit{ActorID: e.ActorID, Action: domain.AuditTimeEntryVoided, Reason: &reason}
		entry, role, establishmentID = e.Entry, e.ActorRole, e.EstablishmentID
	default:
		return
	}

	if role != domain.RoleAdmin {
		return
	}

	audit.TargetID = entry.RootID
	audit.TargetLabel = entry.UserName + " · " + entry.WorkdayDate
	audit.Metadata = domain.TimeEntryAuditMetadata{
		EstablishmentID:    establishmentID,
		UserID:             entry.UserID,
		Type:               entry.Type,
		OccurredAt:         entry.OccurredAt,
		PreviousOccurredAt: previousOccurredAt,
	}

	if err := s.entries.RecordAudit(ctx, audit); err != nil {
		slog.Error("failed to record an admin change to a time entry; it went through and is now unaudited",
			"action", audit.Action, "actor", audit.ActorID, "target", audit.TargetID, "error", err)
	}
}
