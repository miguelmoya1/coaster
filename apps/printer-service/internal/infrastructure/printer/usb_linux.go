//go:build linux

package printer

import (
	"context"
	"fmt"
	"os"
)

type USBPrinter struct {
	DevicePath string // Ej: "/dev/usb/lp0"
	file       *os.File
}

func NewUSBPrinter(identifier string) *USBPrinter {
	return &USBPrinter{DevicePath: identifier}
}

func (u *USBPrinter) Connect(ctx context.Context) error {
	f, err := os.OpenFile(u.DevicePath, os.O_WRONLY, 0)
	if err != nil {
		return fmt.Errorf("error en USB Linux: %w", err)
	}
	u.file = f
	return nil
}

func (u *USBPrinter) Write(b []byte) (int, error) {
	return u.file.Write(b)
}

func (u *USBPrinter) Close() error {
	if u.file != nil {
		return u.file.Close()
	}
	return nil
}
