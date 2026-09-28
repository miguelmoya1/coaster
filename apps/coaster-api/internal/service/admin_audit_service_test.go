package service

import (
	"context"
	"reflect"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestAdminAuditServiceRecordAction(t *testing.T) {
	audit := &adminAuditFake{}
	service := NewAdminAuditService(audit)

	label := "Bar Pepe"
	entry := domain.AdminAuditEntry{
		ActorID: "admin", Action: domain.AuditEstablishmentRenamed, TargetType: domain.AuditTargetEstablishment,
		TargetID: "e1", TargetLabel: &label, Metadata: adminRenameChange{From: "Bar", To: "Bar Pepe"},
	}

	service.RecordAction(context.Background(), domain.AdminAction{Entry: entry})
	service.RecordAction(context.Background(), domain.UserUpdated{UserID: "u1"})

	if len(audit.recorded) != 1 || !reflect.DeepEqual(audit.recorded[0], entry) {
		t.Fatalf("recorded = %+v", audit.recorded)
	}

	audit.fail = true
	service.RecordAction(context.Background(), domain.AdminAction{Entry: entry})
}

func TestAdminAuditServiceList(t *testing.T) {
	audit := &adminAuditFake{recent: []domain.AdminAuditLogEntry{{ID: "a1"}, {ID: "a2"}}}

	page, err := NewAdminAuditService(audit).List(context.Background(), domain.AdminAuditFilter{}, domain.PageRequest{Page: 2, PageSize: 5})
	if err != nil || len(page.Items) != 2 || page.Total != 2 || page.Page != 2 || page.PageSize != 5 {
		t.Fatalf("List = %+v, %v", page, err)
	}
}

func TestAdminMetricsServiceOverview(t *testing.T) {
	metrics := &adminMetricsFake{}
	service := NewAdminMetricsService(metrics)
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }

	overview, err := service.Overview(context.Background())
	if err != nil || overview.Users.Total != 3 {
		t.Fatalf("Overview = %+v, %v", overview, err)
	}

	if !metrics.now.Equal(now) || !metrics.last7Days.Equal(now.Add(-7*24*time.Hour)) || !metrics.last30Days.Equal(now.Add(-30*24*time.Hour)) {
		t.Errorf("windows = %v, %v, %v", metrics.now, metrics.last7Days, metrics.last30Days)
	}
}

func TestAdminNote(t *testing.T) {
	text := func(value string) *string { return &value }

	if got := adminNote(text("  Bar Pepe ")); got == nil || *got != "Bar Pepe" {
		t.Errorf("adminNote(padded) = %v", got)
	}
	if got := adminNote(text("   ")); got != nil {
		t.Errorf("adminNote(blank) = %q", *got)
	}
	if got := adminNote(nil); got != nil {
		t.Errorf("adminNote(nil) = %q", *got)
	}
}
