package service

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestBetaTesterServiceList(t *testing.T) {
	signedUpAt := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	testers := &betaTesterFake{
		testers:  []domain.BetaTester{{ID: "b1", Email: "ana@bar.com"}, {ID: "b2", Email: "luna@cafe.com"}},
		accounts: []domain.BetaSignUp{{UserID: "ana", Email: "ana@bar.com", CreatedAt: signedUpAt}},
	}

	page, err := NewBetaTesterService(testers, &eventRecorder{}, true).List(context.Background(), "", domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || page.Total != 2 || !page.Enforcing || len(page.Items) != 2 {
		t.Fatalf("List = %+v, %v", page, err)
	}

	ana, luna := page.Items[0], page.Items[1]
	if ana.UserID == nil || *ana.UserID != "ana" || ana.SignedUpAt == nil || !ana.SignedUpAt.Equal(signedUpAt) {
		t.Errorf("ana = %+v", ana)
	}
	if luna.UserID != nil || luna.SignedUpAt != nil {
		t.Errorf("luna = %+v", luna)
	}

	empty, err := NewBetaTesterService(&betaTesterFake{}, &eventRecorder{}, false).List(context.Background(), "", domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || empty.Items == nil || empty.Enforcing {
		t.Fatalf("empty List = %+v, %v", empty, err)
	}
}

func TestBetaTesterServiceAdd(t *testing.T) {
	testers := &betaTesterFake{}
	events := &eventRecorder{}
	service := NewBetaTesterService(testers, events, false)

	note := "  Bar Pepe  "
	if err := service.Add(context.Background(), "admin", "  Tester@Bar.com ", &note); err != nil {
		t.Fatal(err)
	}

	if len(testers.testers) != 1 || testers.testers[0].Email != "tester@bar.com" || *testers.testers[0].Note != "Bar Pepe" {
		t.Fatalf("testers = %+v", testers.testers)
	}

	entries := adminActionsIn(events.events)
	if len(entries) != 1 {
		t.Fatalf("events = %v", events.names())
	}
	entry := entries[0]
	if entry.Action != domain.AuditBetaTesterAdded || entry.TargetType != domain.AuditTargetBetaTester || entry.ActorID != "admin" ||
		entry.TargetID != "tester-tester@bar.com" || *entry.TargetLabel != "tester@bar.com" || *entry.Reason != "Bar Pepe" || entry.Metadata != nil {
		t.Errorf("entry = %+v", entry)
	}

	err := service.Add(context.Background(), "admin", "TESTER@bar.com", nil)
	if !isAdminError(err, domain.KindConflict, domain.CodeBetaTesterAlreadyExists) {
		t.Fatalf("Add twice = %v", err)
	}

	blank := "   "
	if err := service.Add(context.Background(), "admin", "other@bar.com", &blank); err != nil {
		t.Fatal(err)
	}
	if testers.testers[1].Note != nil {
		t.Errorf("a blank note was kept: %q", *testers.testers[1].Note)
	}
}

func TestBetaTesterServiceRemove(t *testing.T) {
	testers := &betaTesterFake{testers: []domain.BetaTester{{ID: "b1", Email: "ana@bar.com"}}}
	events := &eventRecorder{}
	service := NewBetaTesterService(testers, events, false)

	if err := service.Remove(context.Background(), "admin", "missing"); !isAdminError(err, domain.KindNotFound, domain.CodeBetaTesterNotFound) {
		t.Fatalf("Remove(missing) = %v", err)
	}
	if len(events.events) != 0 {
		t.Fatalf("events = %v", events.names())
	}

	if err := service.Remove(context.Background(), "admin", "b1"); err != nil {
		t.Fatal(err)
	}
	if len(testers.testers) != 0 {
		t.Fatalf("testers = %+v", testers.testers)
	}

	entries := adminActionsIn(events.events)
	if len(entries) != 1 || entries[0].Action != domain.AuditBetaTesterRemoved || entries[0].TargetID != "b1" ||
		*entries[0].TargetLabel != "ana@bar.com" || entries[0].Reason != nil {
		t.Errorf("entries = %+v", entries)
	}
}

func isAdminError(err error, kind domain.ErrorKind, code string) bool {
	domainErr, ok := err.(*domain.Error)
	return ok && domainErr.Kind == kind && domainErr.Code == code
}
