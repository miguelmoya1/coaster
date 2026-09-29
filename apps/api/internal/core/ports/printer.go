package ports

import (
	"context"
	"io/fs"
	"time"

	"coaster-api/internal/core/domain"
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

type PrinterService interface {
	RedeemPairing(ctx context.Context, code string) (domain.PrinterPairing, error)
	RegisterAddress(ctx context.Context, establishmentID, deviceKey, ipAddress string, port *int) error
	NextJob(ctx context.Context, establishmentID, deviceKey string) (*domain.ClaimedPrintJob, error)
	ReportResult(ctx context.Context, establishmentID, jobID, deviceKey string, result domain.PrintJobResult) error
	Enqueue(ctx context.Context, establishmentID string, ticket domain.PrintTicket) (domain.QueuedPrintJob, error)
	Job(ctx context.Context, establishmentID, jobID string) (*domain.PrintJob, error)
	Connection(ctx context.Context, establishmentID string) (domain.PrinterConnection, error)
	Status(ctx context.Context, establishmentID string) (domain.PrinterStatus, error)
	IssuePairing(ctx context.Context, establishmentID string) (domain.PrinterPairingCode, error)
	GenerateDeviceKey(ctx context.Context, establishmentID string) (domain.PrinterDeviceKey, error)
}

type PrinterReleaseService interface {
	Latest(platform string) (domain.PrinterRelease, error)
	Download(platform, code string) (fs.File, string, error)
}
