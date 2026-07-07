package domain_test

import (
	"context"
	"testing"

	"printer-service/internal/domain"
)

func TestMockPrinter(t *testing.T) {
	mp := &domain.MockPrinter{
		ConnectFunc: func(ctx context.Context) error { return nil },
		WriteFunc:   func(b []byte) (int, error) { return len(b), nil },
		CloseFunc:   func() error { return nil },
	}

	if err := mp.Connect(context.Background()); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if n, err := mp.Write([]byte("hi")); err != nil || n != 2 {
		t.Errorf("unexpected error or n: n=%d err=%v", n, err)
	}
	if err := mp.Close(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
