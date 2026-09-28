package ports

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
)

type TimeEntryRepository interface {
	FindByWorkdayRange(ctx context.Context, establishmentID string, from, to time.Time, userID string) ([]domain.TimeEntryRow, error)

	FindLatestWorkday(ctx context.Context, establishmentID, userID string) ([]domain.TimeEntryRow, error)
	FindByRoots(ctx context.Context, rootIDs []string) ([]domain.TimeEntryRow, error)

	FindCurrentByID(ctx context.Context, establishmentID, id string) (*domain.TimeEntryRow, error)

	FindChain(ctx context.Context, establishmentID string) ([]domain.TimeEntryRow, error)

	Append(ctx context.Context, input domain.AppendTimeEntry) (*domain.TimeEntryRow, error)

	FindActiveMember(ctx context.Context, establishmentID, userID string) (*domain.TimeEntryMember, error)
}

type TimeEntryService interface {
	Clock(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error)
	CurrentWorkday(ctx context.Context, establishmentID, userID string) (*domain.Workday, error)
	TimeSheet(ctx context.Context, establishmentID string, from, to *string, userID string) ([]domain.Workday, error)
	Integrity(ctx context.Context, establishmentID string) (domain.TimeSheetIntegrity, error)
	CreateManual(ctx context.Context, establishmentID string, actor *domain.User, input domain.ManualTimeEntryInput) (domain.TimeEntry, error)
	Amend(ctx context.Context, establishmentID, entryID string, actor *domain.User, input domain.AmendTimeEntryInput) (domain.TimeEntry, error)
	Void(ctx context.Context, establishmentID, entryID string, actor *domain.User, reason string) (domain.TimeEntry, error)
}
