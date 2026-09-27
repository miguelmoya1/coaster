package service

import (
	"context"
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"api-go/internal/core/domain"
)

// In-memory fakes of the ports of the printer module. The long poll reads the job queue from
// its own goroutine while the tests write to it, so the fakes lock.

// fakePrinterConfigRepo is the "PrinterConfig" table.
type fakePrinterConfigRepo struct {
	mu      sync.Mutex
	configs map[string]*domain.PrinterConfig
	created int
}

func newFakePrinterConfigRepo(configs ...domain.PrinterConfig) *fakePrinterConfigRepo {
	repo := &fakePrinterConfigRepo{configs: make(map[string]*domain.PrinterConfig)}
	for _, config := range configs {
		repo.configs[config.EstablishmentID] = &config
	}
	return repo
}

func (f *fakePrinterConfigRepo) get(establishmentID string) *domain.PrinterConfig {
	f.mu.Lock()
	defer f.mu.Unlock()
	config, ok := f.configs[establishmentID]
	if !ok {
		return nil
	}
	copied := *config
	return &copied
}

func (f *fakePrinterConfigRepo) Find(_ context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	return f.get(establishmentID), nil
}

func (f *fakePrinterConfigRepo) Create(_ context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.created++
	config := &domain.PrinterConfig{
		EstablishmentID: establishmentID,
		DeviceKey:       "generated-key-" + strconv.Itoa(f.created),
		Port:            domain.DefaultPrinterPort,
	}
	f.configs[establishmentID] = config
	copied := *config
	return &copied, nil
}

func (f *fakePrinterConfigRepo) RegisterAddress(_ context.Context, establishmentID, ipAddress string, port *int, seenAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	config, ok := f.configs[establishmentID]
	if !ok {
		config = &domain.PrinterConfig{EstablishmentID: establishmentID, DeviceKey: "upserted-key", Port: domain.DefaultPrinterPort}
		f.configs[establishmentID] = config
	}
	config.IPAddress = &ipAddress
	if port != nil {
		config.Port = *port
	}
	config.LastSeenAt = &seenAt
	return nil
}

func (f *fakePrinterConfigRepo) RotateDeviceKey(_ context.Context, establishmentID, deviceKey string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.configs[establishmentID].DeviceKey = deviceKey
	return nil
}

func (f *fakePrinterConfigRepo) TouchLastSeen(_ context.Context, establishmentID string, seenAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.configs[establishmentID].LastSeenAt = &seenAt
	return nil
}

// fakePrinterPairingRepo is the "PrinterPairing" table.
type fakePrinterPairingRepo struct {
	pairings map[string]*fakePrinterPairing
}

type fakePrinterPairing struct {
	establishmentID string
	expiresAt       time.Time
	redeemed        bool
}

func newFakePrinterPairingRepo() *fakePrinterPairingRepo {
	return &fakePrinterPairingRepo{pairings: make(map[string]*fakePrinterPairing)}
}

func (f *fakePrinterPairingRepo) Issue(_ context.Context, code, establishmentID string, expiresAt time.Time) error {
	f.pairings[code] = &fakePrinterPairing{establishmentID: establishmentID, expiresAt: expiresAt}
	return nil
}

func (f *fakePrinterPairingRepo) Redeem(_ context.Context, code string, now time.Time) (string, error) {
	pairing, ok := f.pairings[code]
	if !ok || pairing.redeemed || !pairing.expiresAt.After(now) {
		return "", nil
	}
	pairing.redeemed = true
	return pairing.establishmentID, nil
}

// fakePrintJobRepo is the "PrintJob" table.
type fakePrintJobRepo struct {
	mu           sync.Mutex
	jobs         []*domain.PrintJob
	tickets      map[string]domain.PrintTicket
	claims       int
	requeuedFrom []time.Time
}

func newFakePrintJobRepo() *fakePrintJobRepo {
	return &fakePrintJobRepo{tickets: make(map[string]domain.PrintTicket)}
}

// add queues a job of an establishment straight into the table.
func (f *fakePrintJobRepo) add(id, establishmentID string, status domain.PrintJobStatus, ticket domain.PrintTicket) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.jobs = append(f.jobs, &domain.PrintJob{ID: id, EstablishmentID: establishmentID, Status: status})
	f.tickets[id] = ticket
}

func (f *fakePrintJobRepo) get(id string) *domain.PrintJob {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, job := range f.jobs {
		if job.ID == id {
			copied := *job
			return &copied
		}
	}
	return nil
}

func (f *fakePrintJobRepo) claimCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.claims
}

func (f *fakePrintJobRepo) Enqueue(_ context.Context, establishmentID string, ticket domain.PrintTicket) (string, error) {
	f.mu.Lock()
	id := "job-" + strconv.Itoa(len(f.jobs)+1)
	f.mu.Unlock()

	f.add(id, establishmentID, domain.PrintJobPending, ticket)
	return id, nil
}

func (f *fakePrintJobRepo) FindByID(_ context.Context, id string) (*domain.PrintJob, error) {
	return f.get(id), nil
}

func (f *fakePrintJobRepo) ClaimNext(_ context.Context, establishmentID string, _ time.Time) (*domain.ClaimedPrintJob, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.claims++
	for _, job := range f.jobs {
		if job.EstablishmentID == establishmentID && job.Status == domain.PrintJobPending {
			job.Status = domain.PrintJobPrinting
			payload, _ := json.Marshal(f.tickets[job.ID])
			return &domain.ClaimedPrintJob{ID: job.ID, Payload: payload}, nil
		}
	}
	return nil, nil
}

func (f *fakePrintJobRepo) Complete(_ context.Context, id string, completedAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, job := range f.jobs {
		if job.ID == id && job.Status == domain.PrintJobPrinting {
			completed := domain.NewTime(completedAt)
			job.Status, job.CompletedAt, job.Error = domain.PrintJobPrinted, &completed, nil
		}
	}
	return nil
}

func (f *fakePrintJobRepo) Fail(_ context.Context, id, reason string, completedAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, job := range f.jobs {
		if job.ID == id && job.Status == domain.PrintJobPrinting {
			completed := domain.NewTime(completedAt)
			job.Status, job.CompletedAt, job.Error = domain.PrintJobFailed, &completed, &reason
		}
	}
	return nil
}

func (f *fakePrintJobRepo) RequeueStale(_ context.Context, _ string, claimedBefore, _ time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.requeuedFrom = append(f.requeuedFrom, claimedBefore)
	return nil
}
