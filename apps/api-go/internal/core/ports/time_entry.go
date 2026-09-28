package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type TimeEntryRepository interface {
	FindByWorkdayRange(ctx context.Context, establishmentID string, from, to time.Time, userID string) ([]domain.TimeEntryRow, error)

	FindLatestWorkday(ctx context.Context, establishmentID, userID string) ([]domain.TimeEntryRow, error)
	FindByRoots(ctx context.Context, rootIDs []string) ([]domain.TimeEntryRow, error)

	FindCurrentByID(ctx context.Context, establishmentID, id string) (*domain.TimeEntryRow, error)

	FindChain(ctx context.Context, establishmentID string) ([]domain.TimeEntryRow, error)

	Append(ctx context.Context, input domain.AppendTimeEntry) (*domain.TimeEntryRow, error)

	FindActiveMember(ctx context.Context, establishmentID, userID string) (*domain.TimeEntryMember, error)

	RecordAudit(ctx context.Context, audit domain.TimeEntryAudit) error
}
