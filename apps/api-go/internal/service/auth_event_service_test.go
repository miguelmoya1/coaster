package service

import (
	"context"
	"testing"

	"api-go/internal/core/domain"
)

func TestRecordWritesTheEventDown(t *testing.T) {
	repo := &fakeAuthEvents{}
	event := domain.AuthEventOccurred{Type: domain.AuthEventLoginFailed, Email: "a@b.c", Metadata: map[string]any{"reason": "no_account"}}

	NewAuthEventService(repo).Record(context.Background(), event)

	if len(repo.recorded) != 1 || repo.recorded[0].Metadata["reason"] != "no_account" {
		t.Errorf("recorded = %+v", repo.recorded)
	}
}

func TestRecordSwallowsADatabaseThatWillNotTakeIt(t *testing.T) {
	repo := &fakeAuthEvents{fail: true}

	// It must not panic nor return anything: the login already happened.
	NewAuthEventService(repo).Record(context.Background(), domain.AuthEventOccurred{Type: domain.AuthEventLoggedOut})
}

type otherEvent struct{}

func (otherEvent) Name() string { return "other" }

func TestRecordIgnoresOtherEvents(t *testing.T) {
	repo := &fakeAuthEvents{}

	NewAuthEventService(repo).Record(context.Background(), otherEvent{})

	if len(repo.recorded) != 0 {
		t.Error("recorded an event that is not an auth event")
	}
}
