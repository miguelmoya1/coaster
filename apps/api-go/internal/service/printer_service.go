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

const (
	nextJobHoldOpenFor = 25 * time.Second
	nextJobCheckEvery  = time.Second
)

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

func (s *PrinterService) IssuePairing(ctx context.Context, establishmentID string) (domain.PrinterPairingCode, error) {
	code := domain.NewPairingCode()

	if err := s.pairings.Issue(ctx, code, establishmentID, s.now().Add(domain.PairingCodeTTL)); err != nil {
		return domain.PrinterPairingCode{}, err
	}

	return domain.PrinterPairingCode{Code: code}, nil
}

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

type printerTokenClaims struct {
	EstablishmentID string `json:"establishmentId"`
	jwt.RegisteredClaims
}

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

func (s *PrinterService) StopWaiting() {
	s.stopOnce.Do(func() { close(s.shuttingDown) })
}

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
