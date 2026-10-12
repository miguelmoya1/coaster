package service

import (
	"testing"

	"coaster-api/internal/core/domain"
)

func TestRecordWritesTheEventDown(t *testing.T) {
	repo := &fakeAuthEvents{}
	event := domain.AuthEvent{Type: domain.AuthEventLoginFailed, Email: "a@b.c", Metadata: map[string]any{"reason": "no_account"}}

	deliver(NewAuthEventService(repo).EventHandlers(), event)

	if len(repo.recorded) != 1 || repo.recorded[0].Metadata["reason"] != "no_account" {
		t.Errorf("recorded = %+v", repo.recorded)
	}
}

func TestRecordSwallowsADatabaseThatWillNotTakeIt(t *testing.T) {
	repo := &fakeAuthEvents{fail: true}

	deliver(NewAuthEventService(repo).EventHandlers(), domain.AuthEvent{Type: domain.AuthEventLoggedOut})
}
