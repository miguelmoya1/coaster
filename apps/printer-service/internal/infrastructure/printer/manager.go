package printer

import (
	"context"
	"fmt"

	"printer-service/internal/domain"
)

var AutoDetectFunc = func() (domain.Printer, error) {
	return AutoDetectOS()
}

func AutoDetect() (domain.Printer, error) {
	return AutoDetectFunc()
}

type AutoPrinter struct {
	current domain.Printer
}

func NewAutoPrinter() *AutoPrinter {
	return &AutoPrinter{}
}

func (a *AutoPrinter) Connect(ctx context.Context) error {
	if a.current != nil {
		if err := a.current.Connect(ctx); err == nil {
			return nil
		}
		a.current = nil
	}

	p, err := AutoDetect()
	if err != nil {
		return err
	}
	if err := p.Connect(ctx); err != nil {
		return err
	}

	a.current = p
	return nil
}

func (a *AutoPrinter) Write(b []byte) (int, error) {
	if a.current == nil {
		return 0, fmt.Errorf("printer not connected")
	}
	return a.current.Write(b)
}

func (a *AutoPrinter) Close() error {
	if a.current == nil {
		return nil
	}
	return a.current.Close()
}

func (a *AutoPrinter) String() string {
	if a.current == nil {
		return "auto:(not yet detected)"
	}
	return fmt.Sprintf("auto:%v", a.current)
}
