package service

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

var exchangeNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

func newShiftExchangeFixture() (*ShiftExchangeService, *fakeShiftRepository, *fakeShiftExchangeRepository) {
	shifts := &fakeShiftRepository{shifts: []domain.Shift{
		{ID: "mine", EstablishmentID: "e1", UserID: "ana"},
		{ID: "theirs", EstablishmentID: "e1", UserID: "luis"},
		{ID: "elsewhere", EstablishmentID: "e2", UserID: "ana"},
	}}
	exchanges := newFakeShiftExchangeRepository()

	service := NewShiftExchangeService(shifts, exchanges)
	service.now = func() time.Time { return exchangeNow }

	return service, shifts, exchanges
}

func TestShiftExchangeServiceRequest(t *testing.T) {
	tests := []struct {
		name    string
		shiftID string
		pending bool
		code    string
	}{
		{"offers one's own shift", "mine", false, ""},
		{"shift that does not exist", "missing", false, domain.CodeShiftNotFound},
		{"shift of another establishment", "elsewhere", false, domain.CodeUnauthorizedShiftAction},
		{"somebody else's shift", "theirs", false, domain.CodeNotYourShift},
		{"already on offer", "mine", true, domain.CodeExchangeAlreadyPending},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, _, exchanges := newShiftExchangeFixture()
			if tt.pending {
				exchanges.exchanges["x0"] = &domain.ShiftExchangeRecord{ID: "x0", ShiftID: "mine", Status: domain.ShiftExchangePending}
			}

			err := service.Request(context.Background(), "e1", tt.shiftID, "ana", nil)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(exchanges.created) != 0 {
					t.Fatalf("err = %v, created = %v; want %s", err, exchanges.created, tt.code)
				}
				return
			}
			if err != nil || len(exchanges.created) != 1 || exchanges.created[0] != "mine/ana" {
				t.Fatalf("err = %v, created = %v", err, exchanges.created)
			}
		})
	}
}

func TestShiftExchangeServiceAccept(t *testing.T) {
	later := exchangeNow.Add(24 * time.Hour)
	earlier := exchangeNow.Add(-time.Hour)
	luis := "luis"
	pepa := "pepa"

	tests := []struct {
		name     string
		exchange *domain.ShiftExchangeRecord
		lostRace bool
		code     string
	}{
		{"hands the shift over", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "ana", ShiftStartTime: later}, false, ""},
		{"offered to the one accepting", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "ana", TargetID: &luis, ShiftStartTime: later}, false, ""},
		{"does not exist", nil, false, domain.CodeExchangeNotFound},
		{"already closed", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangeApproved, ShiftEstablishmentID: "e1", RequesterID: "ana", ShiftStartTime: later}, false, domain.CodeInvalidExchange},
		{"another establishment", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e2", RequesterID: "ana", ShiftStartTime: later}, false, domain.CodeUnauthorizedShiftAction},
		{"one's own offer", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis", ShiftStartTime: later}, false, domain.CodeInvalidExchange},
		{"offered to somebody else", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "ana", TargetID: &pepa, ShiftStartTime: later}, false, domain.CodeUnauthorizedShiftAction},
		{"shift already started", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "ana", ShiftStartTime: earlier}, false, domain.CodeExchangeShiftAlreadyStarted},
		{"lost the race", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "ana", ShiftStartTime: later}, true, domain.CodeInvalidExchange},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, _, exchanges := newShiftExchangeFixture()
			exchanges.lostRace = tt.lostRace
			if tt.exchange != nil {
				tt.exchange.ID = "x1"
				tt.exchange.ShiftID = "mine"
				exchanges.exchanges["x1"] = tt.exchange
			}

			err := service.Accept(context.Background(), "e1", "x1", "luis")

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(exchanges.swapped) != 0 {
					t.Fatalf("err = %v, swapped = %v; want %s", err, exchanges.swapped, tt.code)
				}
				return
			}
			if err != nil || len(exchanges.swapped) != 1 || exchanges.swapped[0] != "x1/mine/luis" {
				t.Fatalf("err = %v, swapped = %v", err, exchanges.swapped)
			}
		})
	}
}

func TestShiftExchangeServiceDelete(t *testing.T) {
	tests := []struct {
		name     string
		exchange *domain.ShiftExchangeRecord
		userID   string
		code     string
	}{
		{"the requester withdraws it", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "luis", ""},
		{"the owner withdraws somebody else's", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "owner", ""},
		{"does not exist", nil, "luis", domain.CodeExchangeNotFound},
		{"another establishment", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e2", RequesterID: "luis"}, "luis", domain.CodeExchangeNotFound},
		{"already closed, even for the owner", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangeApproved, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "owner", domain.CodeExchangeAlreadyClosed},
		{"not a member", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "stranger", domain.CodeMemberNotFound},
		{"an inactive member", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "inactive", domain.CodeMemberNotFound},
		{"staff withdrawing somebody else's", &domain.ShiftExchangeRecord{Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1", RequesterID: "luis"}, "ana", domain.CodeUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, _, exchanges := newShiftExchangeFixture()
			exchanges.memberships["e1/owner"] = &domain.Membership{Role: "OWNER", Active: true}
			exchanges.memberships["e1/luis"] = &domain.Membership{Role: "STAFF", Active: true}
			exchanges.memberships["e1/ana"] = &domain.Membership{Role: "MANAGER", Active: true}
			exchanges.memberships["e1/inactive"] = &domain.Membership{Role: "OWNER", Active: false}
			if tt.exchange != nil {
				tt.exchange.ID = "x1"
				exchanges.exchanges["x1"] = tt.exchange
			}

			err := service.Delete(context.Background(), "e1", "x1", tt.userID)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(exchanges.deleted) != 0 {
					t.Fatalf("err = %v, deleted = %v; want %s", err, exchanges.deleted, tt.code)
				}
				return
			}
			if err != nil || len(exchanges.deleted) != 1 {
				t.Fatalf("err = %v, deleted = %v", err, exchanges.deleted)
			}
		})
	}
}

func TestShiftExchangeServiceListPendingFromTheEstablishmentsMidnight(t *testing.T) {
	service, _, exchanges := newShiftExchangeFixture()

	if _, err := service.ListPending(context.Background(), "e1"); err != nil {
		t.Fatal(err)
	}

	if want := time.Date(2026, 9, 26, 22, 0, 0, 0, time.UTC); !exchanges.since.Equal(want) {
		t.Fatalf("since = %s, want %s", exchanges.since.UTC(), want)
	}
}
