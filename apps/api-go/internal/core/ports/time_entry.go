package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// TimeEntryRepository keeps the append-only chain of punches. Rows come in sequence order.
// Finders return nil with a nil error when there is nothing.
type TimeEntryRepository interface {
	// FindByWorkdayRange lists the rows filed between two workdays, both included. An empty
	// userID means everybody.
	FindByWorkdayRange(ctx context.Context, establishmentID string, from, to time.Time, userID string) ([]domain.TimeEntryRow, error)
	// FindLatestWorkday lists the rows of the latest workday the user has punches on.
	FindLatestWorkday(ctx context.Context, establishmentID, userID string) ([]domain.TimeEntryRow, error)
	FindByRoots(ctx context.Context, rootIDs []string) ([]domain.TimeEntryRow, error)
	// FindCurrentByID finds a row of the establishment, with SupersededByID filled.
	FindCurrentByID(ctx context.Context, establishmentID, id string) (*domain.TimeEntryRow, error)
	// FindChain lists every row of the establishment.
	FindChain(ctx context.Context, establishmentID string) ([]domain.TimeEntryRow, error)
	// Append adds a row at the end of the establishment's chain, holding the chain's lock
	// while it reads the last row and writes the new one.
	Append(ctx context.Context, input domain.AppendTimeEntry) (*domain.TimeEntryRow, error)
	// FindActiveMember finds a live, active member of the establishment.
	FindActiveMember(ctx context.Context, establishmentID, userID string) (*domain.TimeEntryMember, error)
	// RecordAudit writes a row of the backoffice log (AdminAuditLog).
	RecordAudit(ctx context.Context, audit domain.TimeEntryAudit) error
}
