package usecase_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"printer-service/internal/domain"
	"printer-service/internal/usecase"
)

func TestPrintTicketUseCase_Execute(t *testing.T) {
	ticket := domain.Ticket{
		Content: []byte("Hello World"),
	}

	t.Run("successful print", func(t *testing.T) {
		mockPrinter := &domain.MockPrinter{
			ConnectFunc: func(ctx context.Context) error { return nil },
			WriteFunc: func(b []byte) (int, error) {
				if string(b) != "Hello World" {
					t.Errorf("expected 'Hello World', got %s", string(b))
				}
				return len(b), nil
			},
			CloseFunc: func() error { return nil },
		}

		uc := usecase.NewPrintTicketUseCase(mockPrinter)
		err := uc.Execute(context.Background(), ticket)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})

	t.Run("fails on connect", func(t *testing.T) {
		mockPrinter := &domain.MockPrinter{
			ConnectFunc: func(ctx context.Context) error {
				return errors.New("connection failed")
			},
		}

		uc := usecase.NewPrintTicketUseCase(mockPrinter)
		err := uc.Execute(context.Background(), ticket)

		if err == nil {
			t.Errorf("expected error, got nil")
		} else if !strings.Contains(err.Error(), "connection failed") {
			t.Errorf("expected connection failed error, got %v", err)
		}
	})

	t.Run("fails on write", func(t *testing.T) {
		mockPrinter := &domain.MockPrinter{
			WriteFunc: func(b []byte) (int, error) {
				return 0, errors.New("write failed")
			},
		}

		uc := usecase.NewPrintTicketUseCase(mockPrinter)
		err := uc.Execute(context.Background(), ticket)

		if err == nil {
			t.Errorf("expected error, got nil")
		} else if !strings.Contains(err.Error(), "write failed") {
			t.Errorf("expected write failed error, got %v", err)
		}
	})
}
