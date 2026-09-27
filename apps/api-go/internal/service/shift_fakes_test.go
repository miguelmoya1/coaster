package service

import (
	"context"
	"slices"
	"strconv"
	"sync"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// In-memory fakes of the ports of shifts, shift exchanges and time entries.

// shiftEventRecorder keeps every event published.
type shiftEventRecorder struct {
	mu     sync.Mutex
	events []ports.Event
}

func (r *shiftEventRecorder) Publish(_ context.Context, event ports.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, event)
}

// shiftRealtimeMessage is one message sent to a stream.
type shiftRealtimeMessage struct {
	establishmentID string
	event           string
	payload         any
}

// shiftRealtimeRecorder keeps what was sent to the streams.
type shiftRealtimeRecorder struct {
	messages []shiftRealtimeMessage
}

func (r *shiftRealtimeRecorder) Publish(establishmentID string, event string, payload any) {
	r.messages = append(r.messages, shiftRealtimeMessage{establishmentID, event, payload})
}

func (r *shiftRealtimeRecorder) Revoke(string, string) {}

// fakeShiftRepository is the "Shift" table.
type fakeShiftRepository struct {
	shifts   []domain.Shift
	deleted  []string
	from, to *time.Time
}

func (f *fakeShiftRepository) ListByEstablishment(_ context.Context, establishmentID string, from, to *time.Time) ([]domain.Shift, error) {
	f.from, f.to = from, to

	found := []domain.Shift{}
	for _, shift := range f.shifts {
		if shift.EstablishmentID != establishmentID {
			continue
		}
		if from != nil && (shift.StartTime.Before(*from) || shift.StartTime.After(*to)) {
			continue
		}
		found = append(found, shift)
	}
	return found, nil
}

func (f *fakeShiftRepository) FindByID(_ context.Context, id string) (*domain.Shift, error) {
	for _, shift := range f.shifts {
		if shift.ID == id {
			return &shift, nil
		}
	}
	return nil, nil
}

func (f *fakeShiftRepository) Create(_ context.Context, input domain.NewShift) (*domain.Shift, error) {
	shift := domain.Shift{
		ID:              "shift-" + strconv.Itoa(len(f.shifts)+1),
		StartTime:       domain.NewInstant(input.StartTime),
		EndTime:         domain.NewInstant(input.EndTime),
		UserID:          input.UserID,
		UserName:        "Ana",
		EstablishmentID: input.EstablishmentID,
		Notes:           input.Notes,
	}
	f.shifts = append(f.shifts, shift)
	return &shift, nil
}

func (f *fakeShiftRepository) Delete(_ context.Context, id string) error {
	f.deleted = append(f.deleted, id)
	f.shifts = slices.DeleteFunc(f.shifts, func(shift domain.Shift) bool { return shift.ID == id })
	return nil
}

// fakeShiftExchangeRepository is the "ShiftExchange" table.
type fakeShiftExchangeRepository struct {
	exchanges   map[string]*domain.ShiftExchangeRecord
	memberships map[string]*domain.Membership
	pending     []domain.ShiftExchange
	since       time.Time
	created     []string
	deleted     []string
	swapped     []string
	lostRace    bool
}

func newFakeShiftExchangeRepository() *fakeShiftExchangeRepository {
	return &fakeShiftExchangeRepository{
		exchanges:   make(map[string]*domain.ShiftExchangeRecord),
		memberships: make(map[string]*domain.Membership),
	}
}

func (f *fakeShiftExchangeRepository) FindByID(_ context.Context, id string) (*domain.ShiftExchangeRecord, error) {
	return f.exchanges[id], nil
}

func (f *fakeShiftExchangeRepository) HasPending(_ context.Context, shiftID string) (bool, error) {
	for _, exchange := range f.exchanges {
		if exchange.ShiftID == shiftID && exchange.Status == domain.ShiftExchangePending {
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeShiftExchangeRepository) ListPending(_ context.Context, _ string, since time.Time) ([]domain.ShiftExchange, error) {
	f.since = since
	return f.pending, nil
}

func (f *fakeShiftExchangeRepository) Membership(_ context.Context, userID, establishmentID string) (*domain.Membership, error) {
	return f.memberships[establishmentID+"/"+userID], nil
}

func (f *fakeShiftExchangeRepository) Create(_ context.Context, shiftID, requesterID string, targetID *string) error {
	f.created = append(f.created, shiftID+"/"+requesterID)
	return nil
}

func (f *fakeShiftExchangeRepository) AcceptAndSwap(_ context.Context, exchangeID, shiftID, userID string) (bool, error) {
	if f.lostRace {
		return false, nil
	}
	f.swapped = append(f.swapped, exchangeID+"/"+shiftID+"/"+userID)
	return true, nil
}

func (f *fakeShiftExchangeRepository) Delete(_ context.Context, id string) error {
	f.deleted = append(f.deleted, id)
	return nil
}

// fakeTimeEntryRepository is the "TimeEntry" chain, one establishment's rows in order.
type fakeTimeEntryRepository struct {
	rows    []domain.TimeEntryRow
	members map[string]*domain.TimeEntryMember
	audits  []domain.TimeEntryAudit
	names   map[string]string
}

func newFakeTimeEntryRepository() *fakeTimeEntryRepository {
	return &fakeTimeEntryRepository{
		members: make(map[string]*domain.TimeEntryMember),
		names:   make(map[string]string),
	}
}

func (f *fakeTimeEntryRepository) addMember(userID, name string, role domain.EstablishmentRole) {
	f.members[userID] = &domain.TimeEntryMember{UserID: userID, Name: name, Email: userID + "@example.com", Role: role}
	f.names[userID] = name
}

func (f *fakeTimeEntryRepository) where(match func(domain.TimeEntryRow) bool) []domain.TimeEntryRow {
	found := []domain.TimeEntryRow{}
	for _, row := range f.rows {
		if match(row) {
			found = append(found, row)
		}
	}
	return found
}

func (f *fakeTimeEntryRepository) FindByWorkdayRange(_ context.Context, establishmentID string, from, to time.Time, userID string) ([]domain.TimeEntryRow, error) {
	return f.where(func(row domain.TimeEntryRow) bool {
		return row.EstablishmentID == establishmentID && !row.WorkdayDate.Before(from) && !row.WorkdayDate.After(to) &&
			(userID == "" || row.UserID == userID)
	}), nil
}

func (f *fakeTimeEntryRepository) FindLatestWorkday(_ context.Context, establishmentID, userID string) ([]domain.TimeEntryRow, error) {
	var latest time.Time
	for _, row := range f.rows {
		if row.EstablishmentID == establishmentID && row.UserID == userID && row.WorkdayDate.After(latest) {
			latest = row.WorkdayDate
		}
	}

	return f.where(func(row domain.TimeEntryRow) bool {
		return row.EstablishmentID == establishmentID && row.UserID == userID && row.WorkdayDate.Equal(latest)
	}), nil
}

func (f *fakeTimeEntryRepository) FindByRoots(_ context.Context, rootIDs []string) ([]domain.TimeEntryRow, error) {
	return f.where(func(row domain.TimeEntryRow) bool { return slices.Contains(rootIDs, row.RootID) }), nil
}

func (f *fakeTimeEntryRepository) FindCurrentByID(_ context.Context, establishmentID, id string) (*domain.TimeEntryRow, error) {
	for _, row := range f.rows {
		if row.ID != id || row.EstablishmentID != establishmentID {
			continue
		}
		for _, other := range f.rows {
			if other.SupersedesID != nil && *other.SupersedesID == id {
				supersededBy := other.ID
				row.SupersededByID = &supersededBy
			}
		}
		return &row, nil
	}
	return nil, nil
}

func (f *fakeTimeEntryRepository) FindChain(_ context.Context, establishmentID string) ([]domain.TimeEntryRow, error) {
	return f.where(func(row domain.TimeEntryRow) bool { return row.EstablishmentID == establishmentID }), nil
}

func (f *fakeTimeEntryRepository) Append(_ context.Context, input domain.AppendTimeEntry) (*domain.TimeEntryRow, error) {
	id := "entry-" + strconv.Itoa(len(f.rows)+1)
	rootID := input.RootID
	if rootID == "" {
		rootID = id
	}
	actorName := f.names[input.ActorID]

	row := domain.TimeEntryRow{
		ID:              id,
		EstablishmentID: input.EstablishmentID,
		UserID:          input.UserID,
		UserName:        input.UserSnapshot.Name,
		UserSnapshot:    input.UserSnapshot,
		Type:            input.Type,
		Action:          input.Action,
		OccurredAt:      input.OccurredAt,
		RecordedAt:      input.OccurredAt,
		WorkdayDate:     input.WorkdayDate,
		Source:          input.Source,
		Latitude:        input.Latitude,
		Longitude:       input.Longitude,
		RootID:          rootID,
		SupersedesID:    input.SupersedesID,
		ActorID:         input.ActorID,
		ActorName:       &actorName,
		Reason:          input.Reason,
		Sequence:        int64(len(f.rows) + 1),
	}
	f.rows = append(f.rows, row)
	return &row, nil
}

func (f *fakeTimeEntryRepository) FindActiveMember(_ context.Context, _ string, userID string) (*domain.TimeEntryMember, error) {
	return f.members[userID], nil
}

func (f *fakeTimeEntryRepository) RecordAudit(_ context.Context, audit domain.TimeEntryAudit) error {
	f.audits = append(f.audits, audit)
	return nil
}
