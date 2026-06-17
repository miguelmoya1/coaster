package domain

import "context"

type Printer interface {
	Connect(ctx context.Context) error
	Write(b []byte) (int, error)
	Close() error
}
