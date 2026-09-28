package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type ShiftService struct {
	shifts   ports.ShiftRepository
	security *SecurityService
	events   ports.EventPublisher
	realtime ports.Realtime
}

func NewShiftService(shifts ports.ShiftRepository, security *SecurityService, events ports.EventPublisher, realtime ports.Realtime) *ShiftService {
	return &ShiftService{shifts: shifts, security: security, events: events, realtime: realtime}
}

func (s *ShiftService) List(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error) {
	var from, to *time.Time

	if startDate != "" {
		parsed, ok := domain.ParseDate(startDate)
		if !ok {
			return nil, domain.BadRequest(domain.CodeInvalidDate)
		}
		from = &parsed
	}

	if endDate != "" {
		parsed, ok := domain.ParseDate(endDate)
		if !ok {
			return nil, domain.BadRequest(domain.CodeInvalidDate)
		}
		to = &parsed
	}

	if from == nil || to == nil {
		from, to = nil, nil
	}

	return s.shifts.ListByEstablishment(ctx, establishmentID, from, to)
}

func (s *ShiftService) ListBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.Shift, error) {
	return s.shifts.ListByEstablishment(ctx, establishmentID, &from, &to)
}

func (s *ShiftService) Create(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error {
	start, startOK := domain.ParseInstant(input.StartTime)
	end, endOK := domain.ParseInstant(input.EndTime)
	if !startOK || !endOK {
		return domain.BadRequest(domain.CodeInvalidDate)
	}

	if !end.After(start) {
		return domain.BadRequest(domain.CodeInvalidShiftRange)
	}

	membership, err := s.security.Membership(ctx, input.UserID, establishmentID)
	if err != nil {
		return err
	}
	if membership == nil || !membership.Active {
		return domain.NotFound(domain.CodeMemberNotFound)
	}

	created, err := s.shifts.Create(ctx, domain.NewShift{
		EstablishmentID: establishmentID,
		UserID:          input.UserID,
		StartTime:       start.Truncate(time.Millisecond),
		EndTime:         end.Truncate(time.Millisecond),
		Notes:           input.Notes,
	})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ShiftCreated{EstablishmentID: establishmentID, Shift: *created})
	return nil
}

func (s *ShiftService) Delete(ctx context.Context, establishmentID, shiftID string) error {
	shift, err := s.shifts.FindByID(ctx, shiftID)
	if err != nil {
		return err
	}
	if shift == nil || shift.EstablishmentID != establishmentID {
		return domain.NotFound(domain.CodeShiftNotFound)
	}

	if err := s.shifts.Delete(ctx, shiftID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ShiftDeleted{EstablishmentID: shift.EstablishmentID, ShiftID: shiftID})
	return nil
}

type shiftDeletedPayload struct {
	ID string `json:"id"`
}

func (s *ShiftService) PublishRealtime(_ context.Context, event ports.Event) {
	switch e := event.(type) {
	case domain.ShiftCreated:
		s.realtime.Publish(e.EstablishmentID, domain.RealtimeShiftCreated, e.Shift)
	case domain.ShiftDeleted:
		s.realtime.Publish(e.EstablishmentID, domain.RealtimeShiftDeleted, shiftDeletedPayload{ID: e.ShiftID})
	}
}
