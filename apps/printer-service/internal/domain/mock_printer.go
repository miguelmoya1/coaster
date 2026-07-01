package domain

import (
	"context"
)

// MockPrinter is a manual mock for the domain.Printer interface to be used in tests.
type MockPrinter struct {
	ConnectFunc func(ctx context.Context) error
	WriteFunc   func(b []byte) (int, error)
	CloseFunc   func() error
}

func (m *MockPrinter) Connect(ctx context.Context) error {
	if m.ConnectFunc != nil {
		return m.ConnectFunc(ctx)
	}
	return nil
}

func (m *MockPrinter) Write(b []byte) (int, error) {
	if m.WriteFunc != nil {
		return m.WriteFunc(b)
	}
	return len(b), nil
}

func (m *MockPrinter) Close() error {
	if m.CloseFunc != nil {
		return m.CloseFunc()
	}
	return nil
}
