package printer

import (
	"context"
	"fmt"
	"printer-service/internal/domain"
)

// AutoDetectFunc allows mocking the OS detection in tests
var AutoDetectFunc = func() (domain.Printer, error) {
	return AutoDetectOS()
}

func AutoDetect() (domain.Printer, error) {
	return AutoDetectFunc()
}

type AutoPrinter struct {
	actualPrinter domain.Printer
}

func NewAutoPrinter() *AutoPrinter {
	return &AutoPrinter{}
}

func (a *AutoPrinter) Connect(ctx context.Context) error {
	p, err := AutoDetect()
	if err != nil {
		return err
	}
	if err := p.Connect(ctx); err != nil {
		return err
	}
	a.actualPrinter = p
	return nil
}

func (a *AutoPrinter) Write(b []byte) (int, error) {
	if a.actualPrinter == nil {
		return 0, fmt.Errorf("printer not connected")
	}
	return a.actualPrinter.Write(b)
}

func (a *AutoPrinter) Close() error {
	if a.actualPrinter != nil {
		err := a.actualPrinter.Close()
		a.actualPrinter = nil
		return err
	}
	return nil
}
