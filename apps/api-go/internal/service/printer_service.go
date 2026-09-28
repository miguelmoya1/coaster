package service

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"strings"
	"sync"
	"time"
	"uuid"

	"github.com/golang-jwt/jwt/v5"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// The long poll of GET printer/jobs/next: how long it holds the request open and how often it
// looks at the queue meanwhile.
const (
	nextJobHoldOpenFor = 25 * time.Second
	nextJobCheckEvery  = time.Second
)

// PrinterService is the printer module: how the bridge of an establishment pairs and
// authenticates, where the web app finds it, and the queue of tickets it prints.
type PrinterService struct {
	configs     ports.PrinterConfigRepository
	pairings    ports.PrinterPairingRepository
	jobs        ports.PrintJobRepository
	tokenSecret []byte
	now         func() time.Time

	holdOpenFor  time.Duration
	checkEvery   time.Duration
	shuttingDown chan struct{}
	stopOnce     sync.Once
}

// NewPrinterService signs the connection tokens with tokenSecret (PRINTER_JWT_SECRET), the
// secret the bridges verify them with.
func NewPrinterService(configs ports.PrinterConfigRepository, pairings ports.PrinterPairingRepository, jobs ports.PrintJobRepository, tokenSecret string) *PrinterService {
	return &PrinterService{
		configs:      configs,
		pairings:     pairings,
		jobs:         jobs,
		tokenSecret:  []byte(tokenSecret),
		now:          time.Now,
		holdOpenFor:  nextJobHoldOpenFor,
		checkEvery:   nextJobCheckEvery,
		shuttingDown: make(chan struct{}),
	}
}

// GenerateDeviceKey is GenerateDeviceKeyCommand: the first key of the establishment's bridge,
// or a new one that replaces it. The previous key stops working.
func (s *PrinterService) GenerateDeviceKey(ctx context.Context, establishmentID string) (domain.PrinterDeviceKey, error) {
	existing, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return domain.PrinterDeviceKey{}, err
	}

	if existing == nil {
		created, err := s.configs.Create(ctx, establishmentID)
		if err != nil {
			return domain.PrinterDeviceKey{}, err
		}
		slog.Info("device key issued", "establishmentId", establishmentID)
		return domain.PrinterDeviceKey{DeviceKey: created.DeviceKey}, nil
	}

	deviceKey := uuid.NewV4().String()
	if err := s.configs.RotateDeviceKey(ctx, establishmentID, deviceKey); err != nil {
		return domain.PrinterDeviceKey{}, err
	}
	slog.Info("device key rotated; the previous key no longer works", "establishmentId", establishmentID)

	return domain.PrinterDeviceKey{DeviceKey: deviceKey}, nil
}

// IssuePairing is IssuePairingCommand: a one-use code for a bridge download, valid for an hour.
func (s *PrinterService) IssuePairing(ctx context.Context, establishmentID string) (domain.PrinterPairingCode, error) {
	code := domain.NewPairingCode()

	if err := s.pairings.Issue(ctx, code, establishmentID, s.now().Add(domain.PairingCodeTTL)); err != nil {
		return domain.PrinterPairingCode{}, err
	}

	return domain.PrinterPairingCode{Code: code}, nil
}

// RedeemPairing is RedeemPairingCommand: the bridge trades the code in its filename for the
// ids it needs. An establishment that already has a bridge keeps its device key.
func (s *PrinterService) RedeemPairing(ctx context.Context, code string) (domain.PrinterPairing, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if len(code) != domain.PairingCodeLength {
		return domain.PrinterPairing{}, domain.NotFound(domain.CodePrinterPairingInvalid)
	}

	establishmentID, err := s.pairings.Redeem(ctx, code, s.now())
	if err != nil {
		return domain.PrinterPairing{}, err
	}
	if establishmentID == "" {
		return domain.PrinterPairing{}, domain.NotFound(domain.CodePrinterPairingInvalid)
	}

	config, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return domain.PrinterPairing{}, err
	}
	if config == nil {
		config, err = s.configs.Create(ctx, establishmentID)
		if err != nil {
			return domain.PrinterPairing{}, err
		}
	}

	return domain.PrinterPairing{EstablishmentID: establishmentID, DeviceKey: config.DeviceKey}, nil
}

// RegisterAddress is RegisterPrinterIpCommand: the heartbeat of the bridge, with where it
// listens on the local network. A nil port keeps the one stored.
func (s *PrinterService) RegisterAddress(ctx context.Context, establishmentID, deviceKey, ipAddress string, port *int) error {
	if err := s.authenticate(ctx, establishmentID, deviceKey); err != nil {
		return err
	}

	if err := s.configs.RegisterAddress(ctx, establishmentID, ipAddress, port, s.now()); err != nil {
		return err
	}
	slog.Info("printer registered", "establishmentId", establishmentID, "ipAddress", ipAddress)

	return nil
}

// Status is GetPrinterStatusQuery. The bridge is online when it has called in the last two
// minutes.
func (s *PrinterService) Status(ctx context.Context, establishmentID string) (domain.PrinterStatus, error) {
	config, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return domain.PrinterStatus{}, err
	}
	if config == nil {
		return domain.PrinterStatus{EstablishmentID: establishmentID, Port: domain.DefaultPrinterPort}, nil
	}

	status := domain.PrinterStatus{EstablishmentID: establishmentID, IPAddress: config.IPAddress, Port: config.Port}
	if config.LastSeenAt != nil {
		lastSeenAt := domain.NewTime(*config.LastSeenAt)
		status.LastSeenAt = &lastSeenAt
		status.IsOnline = s.now().Sub(*config.LastSeenAt) < domain.PrinterOnlineWindow
	}

	return status, nil
}

// Connection is GetPrinterConnectionQuery: where the bridge listens, and a token it accepts
// from the web app.
func (s *PrinterService) Connection(ctx context.Context, establishmentID string) (domain.PrinterConnection, error) {
	config, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return domain.PrinterConnection{}, err
	}
	if config == nil || config.IPAddress == nil || *config.IPAddress == "" {
		return domain.PrinterConnection{}, domain.NotFound(domain.CodePrinterNotConnected)
	}

	token, err := s.signToken(establishmentID)
	if err != nil {
		return domain.PrinterConnection{}, err
	}

	return domain.PrinterConnection{IPAddress: *config.IPAddress, Port: config.Port, Token: token}, nil
}

// printerTokenClaims is the payload the bridge reads (JWTPayload in apps/printer-service).
type printerTokenClaims struct {
	EstablishmentID string `json:"establishmentId"`
	jwt.RegisteredClaims
}

// signToken is PrinterTokenService.generateToken: an HS256 token for the establishment that
// lasts eight days. The bridge refuses a token without exp.
func (s *PrinterService) signToken(establishmentID string) (string, error) {
	now := s.now()

	claims := printerTokenClaims{
		EstablishmentID: establishmentID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(domain.PrinterTokenTTL)),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.tokenSecret)
}

// Enqueue is EnqueuePrintJobCommand: the web app queues a ticket for the bridge.
func (s *PrinterService) Enqueue(ctx context.Context, establishmentID string, ticket domain.PrintTicket) (domain.QueuedPrintJob, error) {
	config, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return domain.QueuedPrintJob{}, err
	}
	if config == nil {
		return domain.QueuedPrintJob{}, domain.NotFound(domain.CodePrinterNotConfigured)
	}

	id, err := s.jobs.Enqueue(ctx, establishmentID, ticket)
	if err != nil {
		return domain.QueuedPrintJob{}, err
	}
	slog.Info("print job queued", "jobId", id, "establishmentId", establishmentID)

	return domain.QueuedPrintJob{JobID: id}, nil
}

// Job is GetPrintJobQuery: whether a queued ticket has printed.
func (s *PrinterService) Job(ctx context.Context, establishmentID, jobID string) (*domain.PrintJob, error) {
	if err := s.requeueStale(ctx, establishmentID); err != nil {
		return nil, err
	}

	job, err := s.jobs.FindByID(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil || job.EstablishmentID != establishmentID {
		return nil, domain.NotFound(domain.CodePrintJobNotFound)
	}

	return job, nil
}

// NextJob is ClaimNextPrintJobQuery, the long poll of the bridge. It first puts back in the
// queue the jobs a previous bridge never answered for, then hands out the oldest pending job,
// looking every second for up to 25 seconds. It returns nil when nothing arrived or the
// server is shutting down, and ctx's error when the bridge hung up.
func (s *PrinterService) NextJob(ctx context.Context, establishmentID, deviceKey string) (*domain.ClaimedPrintJob, error) {
	if err := s.authenticate(ctx, establishmentID, deviceKey); err != nil {
		return nil, err
	}

	if err := s.configs.TouchLastSeen(ctx, establishmentID, s.now()); err != nil {
		return nil, err
	}

	if err := s.requeueStale(ctx, establishmentID); err != nil {
		return nil, err
	}

	giveUp := time.NewTimer(s.holdOpenFor)
	defer giveUp.Stop()
	check := time.NewTicker(s.checkEvery)
	defer check.Stop()

	for {
		job, err := s.jobs.ClaimNext(ctx, establishmentID, s.now())
		if err != nil {
			return nil, err
		}
		if job != nil {
			slog.Debug("handed a print job to the bridge", "jobId", job.ID, "establishmentId", establishmentID)
			return job, nil
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-s.shuttingDown:
			return nil, nil
		case <-giveUp.C:
			return nil, nil
		case <-check.C:
		}
	}
}

func (s *PrinterService) requeueStale(ctx context.Context, establishmentID string) error {
	now := s.now()
	return s.jobs.RequeueStale(ctx, establishmentID, now.Add(-domain.PrintJobStaleAfter), now)
}

// StopWaiting makes every long poll answer at once, now and from now on. main calls it when
// the server starts to shut down, so a bridge waiting for work does not hold the shutdown up.
func (s *PrinterService) StopWaiting() {
	s.stopOnce.Do(func() { close(s.shuttingDown) })
}

// ReportResult is ReportPrintJobResultCommand: the bridge says whether the ticket made it onto
// paper. Only a job that is printing changes.
func (s *PrinterService) ReportResult(ctx context.Context, establishmentID, jobID, deviceKey string, result domain.PrintJobResult) error {
	if err := s.authenticate(ctx, establishmentID, deviceKey); err != nil {
		return err
	}

	job, err := s.jobs.FindByID(ctx, jobID)
	if err != nil {
		return err
	}
	if job == nil || job.EstablishmentID != establishmentID {
		return domain.NotFound(domain.CodePrintJobNotFound)
	}

	if result.Printed {
		if err := s.jobs.Complete(ctx, job.ID, s.now()); err != nil {
			return err
		}
		slog.Info("print job printed", "jobId", job.ID)
	} else {
		reason := domain.PrintJobUnexplainedError
		if result.Error != nil {
			reason = *result.Error
		}
		if err := s.jobs.Fail(ctx, job.ID, reason, s.now()); err != nil {
			return err
		}
		slog.Warn("print job failed", "jobId", job.ID, "error", reason)
	}

	return s.configs.TouchLastSeen(ctx, establishmentID, s.now())
}

// authenticate is DeviceKeyService.authenticate: the device key the bridge sent has to be
// the one of the establishment. It is compared in constant time.
func (s *PrinterService) authenticate(ctx context.Context, establishmentID, deviceKey string) error {
	if deviceKey == "" {
		return domain.Unauthorized(domain.MessageDeviceKeyRequired)
	}

	config, err := s.configs.Find(ctx, establishmentID)
	if err != nil {
		return err
	}
	if config == nil {
		return domain.NotFound(domain.CodePrinterNotConfigured)
	}

	if subtle.ConstantTimeCompare([]byte(config.DeviceKey), []byte(deviceKey)) != 1 {
		return domain.Forbidden(domain.CodePrinterInvalidDeviceKey)
	}

	return nil
}
