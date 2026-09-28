package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// PrinterConfigRepository keeps the bridge of each establishment ("PrinterConfig").
type PrinterConfigRepository interface {
	// Find returns nil, nil when the establishment has no bridge.
	Find(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error)
	// Create gives the establishment a bridge with a new device key and no address yet.
	Create(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error)
	// RegisterAddress records where the bridge listens and that it was seen at seenAt,
	// creating the bridge if the establishment had none. A nil port leaves the one stored.
	RegisterAddress(ctx context.Context, establishmentID, ipAddress string, port *int, seenAt time.Time) error
	RotateDeviceKey(ctx context.Context, establishmentID, deviceKey string) error
	TouchLastSeen(ctx context.Context, establishmentID string, seenAt time.Time) error
}

// PrinterPairingRepository keeps the one-use codes a bridge pairs with ("PrinterPairing").
type PrinterPairingRepository interface {
	Issue(ctx context.Context, code, establishmentID string, expiresAt time.Time) error
	// Redeem spends the code when it has not been used and is still valid at now, and returns
	// its establishment. It returns "" when there was nothing to spend.
	Redeem(ctx context.Context, code string, now time.Time) (string, error)
}

// PrintJobRepository keeps the queue of tickets of each establishment ("PrintJob").
type PrintJobRepository interface {
	// Enqueue queues the ticket as pending and returns the id of the job.
	Enqueue(ctx context.Context, establishmentID string, ticket domain.PrintTicket) (string, error)
	// FindByID returns nil, nil when there is no such job.
	FindByID(ctx context.Context, id string) (*domain.PrintJob, error)
	// ClaimNext hands out the oldest pending job of the establishment: it marks it printing
	// and counts one more attempt. It returns nil, nil when nothing is pending.
	ClaimNext(ctx context.Context, establishmentID string, claimedAt time.Time) (*domain.ClaimedPrintJob, error)
	// Complete and Fail close a job that is printing; a job in any other state stays as it is.
	Complete(ctx context.Context, id string, completedAt time.Time) error
	Fail(ctx context.Context, id, reason string, completedAt time.Time) error
	// RequeueStale puts back in the queue the jobs of the establishment claimed before
	// claimedBefore, and fails those that have used up their attempts.
	RequeueStale(ctx context.Context, establishmentID string, claimedBefore, now time.Time) error
}
