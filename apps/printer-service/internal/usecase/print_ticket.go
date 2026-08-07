package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"printer-service/internal/domain"
)

const DefaultTimeout = 15 * time.Second

type PrintTicketUseCase struct {
	printer domain.Printer
	timeout time.Duration

	mu sync.Mutex
}

func NewPrintTicketUseCase(p domain.Printer) *PrintTicketUseCase {
	return &PrintTicketUseCase{printer: p, timeout: DefaultTimeout}
}

func (uc *PrintTicketUseCase) AcquireIdle(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for {
		if uc.mu.TryLock() {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func (uc *PrintTicketUseCase) Execute(ctx context.Context, ticket domain.Ticket) error {
	if len(ticket.Content) == 0 {
		return errors.New("refusing to print an empty ticket")
	}

	uc.mu.Lock()
	defer uc.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), uc.timeout)
	defer cancel()

	if err := uc.printer.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to printer: %w", err)
	}

	defer func() {
		if err := uc.printer.Close(); err != nil {
			log.Printf("Warning: could not close printer cleanly: %v\n", err)
		}
	}()

	if _, err := uc.printer.Write(ticket.Content); err != nil {
		return fmt.Errorf("failed to print ticket: %w", err)
	}

	return nil
}
