package usecase

import (
	"context"
	"fmt"
	"printer-service/internal/domain"
)

type PrintTicketUseCase struct {
	printer domain.Printer
}

func NewPrintTicketUseCase(p domain.Printer) *PrintTicketUseCase {
	return &PrintTicketUseCase{printer: p}
}

func (uc *PrintTicketUseCase) Execute(ctx context.Context, ticket domain.Ticket) error {
	if err := uc.printer.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to printer: %w", err)
	}
	defer uc.printer.Close()

	if _, err := uc.printer.Write(ticket.Content); err != nil {
		return fmt.Errorf("failed to print ticket: %w", err)
	}

	return nil
}
