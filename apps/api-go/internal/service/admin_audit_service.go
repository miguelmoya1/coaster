package service

import (
	"context"
	"log/slog"
	"strings"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// AdminAuditService is the backoffice log: what platform admins did, and who did it.
type AdminAuditService struct {
	audit ports.AdminAuditRepository
}

func NewAdminAuditService(audit ports.AdminAuditRepository) *AdminAuditService {
	return &AdminAuditService{audit: audit}
}

// List is ListAuditLogQuery: the log newest first, one page at a time.
func (s *AdminAuditService) List(ctx context.Context, filter domain.AdminAuditFilter, page domain.PageRequest) (domain.Paginated[domain.AdminAuditLogEntry], error) {
	entries, total, err := s.audit.List(ctx, filter, page)
	if err != nil {
		return domain.Paginated[domain.AdminAuditLogEntry]{}, err
	}

	return domain.NewPage(entries, total, page), nil
}

// RecordAction is RecordAdminActionHandler: it writes the entry an AdminAction carries. It
// subscribes to the EventPublisher. A failure is logged and swallowed: the action went
// through all the same.
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

// adminNote is what the backoffice keeps of a note or a reason an admin typed (value?.trim()
// || null): the text trimmed, and nil when there is none or it is blank.
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
