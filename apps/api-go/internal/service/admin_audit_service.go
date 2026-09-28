package service

import (
	"context"
	"log/slog"
	"strings"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type AdminAuditService struct {
	audit ports.AdminAuditRepository
}

func NewAdminAuditService(audit ports.AdminAuditRepository) *AdminAuditService {
	return &AdminAuditService{audit: audit}
}

func (s *AdminAuditService) List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) (domain.Paginated[domain.AdminAuditLogEntry], error) {
	entries, total, err := s.audit.List(ctx, filter, page)
	if err != nil {
		return domain.Paginated[domain.AdminAuditLogEntry]{}, err
	}

	return domain.NewPage(entries, total, page), nil
}

func (s *AdminAuditService) RecordAction(ctx context.Context, event ports.Event) {
	action, ok := event.(domain.AdminAction)
	if !ok {
		return
	}

	entry := action.Entry
	if err := s.audit.Record(ctx, entry); err != nil {
		slog.Error("failed to record an admin action; the action itself went through and is now unaudited",
			"action", entry.Action, "actor", entry.ActorID, "targetType", entry.TargetType, "target", entry.TargetID, "error", err)
	}
}

func adminNote(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
