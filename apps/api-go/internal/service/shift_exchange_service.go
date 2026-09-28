package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type ShiftExchangeService struct {
	shifts    ports.ShiftRepository
	exchanges ports.ShiftExchangeRepository
	now       func() time.Time
}

func NewShiftExchangeService(shifts ports.ShiftRepository, exchanges ports.ShiftExchangeRepository) *ShiftExchangeService {
	return &ShiftExchangeService{shifts: shifts, exchanges: exchanges, now: time.Now}
}

func (s *ShiftExchangeService) ListPending(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error) {
	return s.exchanges.ListPending(ctx, establishmentID, domain.StartOfEstablishmentDay(s.now()))
}

func (s *ShiftExchangeService) Request(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error {
	shift, err := s.shifts.FindByID(ctx, shiftID)
	if err != nil {
		return err
	}
	if shift == nil {
		return domain.NotFound(domain.CodeShiftNotFound)
	}
	if shift.EstablishmentID != establishmentID {
		return domain.Forbidden(domain.CodeUnauthorizedShiftAction)
	}
	if shift.UserID != requesterID {
		return domain.Forbidden(domain.CodeNotYourShift)
	}

	pending, err := s.exchanges.HasPending(ctx, shiftID)
	if err != nil {
		return err
	}
	if pending {
		return domain.BadRequest(domain.CodeExchangeAlreadyPending)
	}

	return s.exchanges.Create(ctx, shiftID, requesterID, targetID)
}

func (s *ShiftExchangeService) Accept(ctx context.Context, establishmentID, exchangeID, userID string) error {
	exchange, err := s.exchanges.FindByID(ctx, exchangeID)
	if err != nil {
		return err
	}
	if exchange == nil {
		return domain.NotFound(domain.CodeExchangeNotFound)
	}
	if exchange.Status != domain.ShiftExchangePending {
		return domain.BadRequest(domain.CodeInvalidExchange)
	}
	if exchange.ShiftEstablishmentID != establishmentID {
		return domain.Forbidden(domain.CodeUnauthorizedShiftAction)
	}
	if exchange.RequesterID == userID {
		return domain.BadRequest(domain.CodeInvalidExchange)
	}
	if exchange.TargetID != nil && *exchange.TargetID != userID {
		return domain.Forbidden(domain.CodeUnauthorizedShiftAction)
	}
	if !exchange.ShiftStartTime.After(s.now()) {
		return domain.BadRequest(domain.CodeExchangeShiftAlreadyStarted)
	}

	claimed, err := s.exchanges.AcceptAndSwap(ctx, exchangeID, exchange.ShiftID, userID)
	if err != nil {
		return err
	}
	if !claimed {
		return domain.BadRequest(domain.CodeInvalidExchange)
	}

	return nil
}

func (s *ShiftExchangeService) Delete(ctx context.Context, establishmentID, exchangeID, userID string) error {
	exchange, err := s.exchanges.FindByID(ctx, exchangeID)
	if err != nil {
		return err
	}
	if exchange == nil || exchange.ShiftEstablishmentID != establishmentID {
		return domain.NotFound(domain.CodeExchangeNotFound)
	}
	if exchange.Status != domain.ShiftExchangePending {
		return domain.BadRequest(domain.CodeExchangeAlreadyClosed)
	}

	member, err := s.exchanges.Membership(ctx, userID, establishmentID)
	if err != nil {
		return err
	}
	if member == nil || !member.Active {
		return domain.Forbidden(domain.CodeMemberNotFound)
	}
	if domain.EstablishmentRole(member.Role) != domain.EstablishmentRoleOwner && exchange.RequesterID != userID {
		return domain.Forbidden(domain.CodeUnauthorized)
	}

	return s.exchanges.Delete(ctx, exchangeID)
}
