package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type PrinterConfigRepository interface {
	Find(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error)

	Create(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error)

	RegisterAddress(ctx context.Context, establishmentID, ipAddress string, port *int, seenAt time.Time) error
	RotateDeviceKey(ctx context.Context, establishmentID, deviceKey string) error
	TouchLastSeen(ctx context.Context, establishmentID string, seenAt time.Time) error
}

type PrinterPairingRepository interface {
	Issue(ctx context.Context, code, establishmentID string, expiresAt time.Time) error

	Redeem(ctx context.Context, code string, now time.Time) (string, error)
}

type PrintJobRepository interface {
	Enqueue(ctx context.Context, establishmentID string, ticket domain.PrintTicket) (string, error)

	FindByID(ctx context.Context, id string) (*domain.PrintJob, error)

	ClaimNext(ctx context.Context, establishmentID string, claimedAt time.Time) (*domain.ClaimedPrintJob, error)

	Complete(ctx context.Context, id string, completedAt time.Time) error
	Fail(ctx context.Context, id, reason string, completedAt time.Time) error

	RequeueStale(ctx context.Context, establishmentID string, claimedBefore, now time.Time) error
}
