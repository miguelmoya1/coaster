package service

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

type shiftFixture struct {
	service  *ShiftService
	repo     *fakeShiftRepository
	security *fakeSecurity
	events   *shiftEventRecorder
	realtime *shiftRealtimeRecorder
}

func newShiftFixture() *shiftFixture {
	repo := &fakeShiftRepository{}
	security := &fakeSecurity{memberships: map[string]*domain.Membership{
		"e1/worker":   {Role: "STAFF", Active: true},
		"e1/inactive": {Role: "STAFF", Active: false},
	}}
	securityService, _ := newTestSecurity(security, nil)
	events := &shiftEventRecorder{}
	realtime := &shiftRealtimeRecorder{}

	return &shiftFixture{
		service:  NewShiftService(repo, securityService, events, realtime),
		repo:     repo,
		security: security,
		events:   events,
		realtime: realtime,
	}
}

func TestShiftServiceCreate(t *testing.T) {
	notes := "Mañana"
	tests := []struct {
		name  string
		input domain.CreateShiftInput
		code  string
	}{
		{"creates and announces the shift", domain.CreateShiftInput{UserID: "worker", StartTime: "2026-09-27T08:00:00Z", EndTime: "2026-09-27T16:00:00.000Z", Notes: &notes}, ""},
		{"refuses a time without an offset", domain.CreateShiftInput{UserID: "worker", StartTime: "2026-09-27T08:00:00", EndTime: "2026-09-27T16:00:00Z"}, domain.CodeInvalidDate},
		{"refuses a shift that ends before it starts", domain.CreateShiftInput{UserID: "worker", StartTime: "2026-09-27T16:00:00Z", EndTime: "2026-09-27T08:00:00Z"}, domain.CodeInvalidShiftRange},
		{"refuses a shift with no duration", domain.CreateShiftInput{UserID: "worker", StartTime: "2026-09-27T08:00:00Z", EndTime: "2026-09-27T08:00:00Z"}, domain.CodeInvalidShiftRange},
		{"refuses somebody who does not work here", domain.CreateShiftInput{UserID: "stranger", StartTime: "2026-09-27T08:00:00Z", EndTime: "2026-09-27T16:00:00Z"}, domain.CodeMemberNotFound},
		{"refuses an inactive member", domain.CreateShiftInput{UserID: "inactive", StartTime: "2026-09-27T08:00:00Z", EndTime: "2026-09-27T16:00:00Z"}, domain.CodeMemberNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newShiftFixture()
			err := f.service.Create(context.Background(), "e1", tt.input)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.shifts) != 0 || len(f.events.events) != 0 {
					t.Fatalf("err = %v, shifts = %d, events = %d; want %s and nothing saved", err, len(f.repo.shifts), len(f.events.events), tt.code)
				}
				return
			}

			if err != nil || len(f.repo.shifts) != 1 {
				t.Fatalf("err = %v, shifts = %+v", err, f.repo.shifts)
			}
			created, ok := f.events.events[0].(domain.ShiftCreatedEvent)
			if !ok || created.EstablishmentID != "e1" || created.Shift.ID != f.repo.shifts[0].ID || *created.Shift.Notes != notes {
				t.Fatalf("event = %+v", f.events.events)
			}
			if !created.Shift.EndTime.Equal(time.Date(2026, 9, 27, 16, 0, 0, 0, time.UTC)) {
				t.Fatalf("end = %s", created.Shift.EndTime)
			}
		})
	}
}

func TestShiftServiceList(t *testing.T) {
	f := newShiftFixture()
	f.repo.shifts = []domain.Shift{{ID: "s1", EstablishmentID: "e1", StartTime: domain.NewInstant(time.Date(2026, 9, 27, 8, 0, 0, 0, time.UTC))}}
	ctx := context.Background()

	shifts, err := f.service.List(ctx, "e1", "", "")
	if err != nil || len(shifts) != 1 || f.repo.from != nil {
		t.Fatalf("without dates = %+v, %v, from %v", shifts, err, f.repo.from)
	}

	if _, err := f.service.List(ctx, "e1", "2026-09-27T00:00:00Z", ""); err != nil || f.repo.from != nil {
		t.Fatalf("one date alone must not filter: %v, from %v", err, f.repo.from)
	}

	shifts, err = f.service.List(ctx, "e1", "2026-09-28", "2026-09-29")
	if err != nil || len(shifts) != 0 || f.repo.from == nil {
		t.Fatalf("with both dates = %+v, %v", shifts, err)
	}

	if _, err := f.service.List(ctx, "e1", "no es una fecha", "2026-09-29"); !domain.HasCode(err, domain.CodeInvalidDate) {
		t.Fatalf("a bad date = %v", err)
	}
}

func TestShiftServiceDelete(t *testing.T) {
	tests := []struct {
		name    string
		shiftID string
		code    string
	}{
		{"deletes and announces it", "s1", ""},
		{"does not exist", "missing", domain.CodeShiftNotFound},
		{"belongs to another establishment", "s2", domain.CodeShiftNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newShiftFixture()
			f.repo.shifts = []domain.Shift{{ID: "s1", EstablishmentID: "e1"}, {ID: "s2", EstablishmentID: "e2"}}

			err := f.service.Delete(context.Background(), "e1", tt.shiftID)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.repo.deleted) != 0 {
					t.Fatalf("err = %v, deleted = %v", err, f.repo.deleted)
				}
				return
			}
			if err != nil || len(f.repo.deleted) != 1 || f.events.events[0] != (domain.ShiftDeletedEvent{EstablishmentID: "e1", ShiftID: "s1"}) {
				t.Fatalf("err = %v, deleted = %v, events = %+v", err, f.repo.deleted, f.events.events)
			}
		})
	}
}

func TestShiftServicePublishRealtime(t *testing.T) {
	f := newShiftFixture()
	shift := domain.Shift{ID: "s1", EstablishmentID: "e1"}

	deliver(f.service.EventHandlers(), domain.ShiftCreatedEvent{EstablishmentID: "e1", Shift: shift})
	deliver(f.service.EventHandlers(), domain.ShiftDeletedEvent{EstablishmentID: "e1", ShiftID: "s1"})

	want := []shiftRealtimeMessage{
		{"e1", domain.RealtimeShiftCreated, shift},
		{"e1", domain.RealtimeShiftDeleted, shiftDeletedPayload{ID: "s1"}},
	}
	if len(f.realtime.messages) != len(want) {
		t.Fatalf("messages = %+v", f.realtime.messages)
	}
	for i := range want {
		if f.realtime.messages[i] != want[i] {
			t.Errorf("message %d = %+v, want %+v", i, f.realtime.messages[i], want[i])
		}
	}
}
