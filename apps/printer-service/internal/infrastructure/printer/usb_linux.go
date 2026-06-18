//go:build linux

package printer

import (
	"context"
	"fmt"
	"os"
)

type USBPrinter struct {
	DevicePath string
	file       *os.File
}

func NewUSBPrinter(identifier string) *USBPrinter {
	return &USBPrinter{DevicePath: identifier}
}

func (u *USBPrinter) Connect(ctx context.Context) error {
	f, err := os.OpenFile(u.DevicePath, os.O_WRONLY, 0)
	if err != nil {
		return fmt.Errorf("Linux USB error: %w", err)
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

func AutoDetectOS() (*USBPrinter, error) {
	pathsToTry := []string{}
	for i := range 10 {
		pathsToTry = append(pathsToTry, fmt.Sprintf("/dev/usb/lp%d", i))
	}
	for i := range 5 {
		pathsToTry = append(pathsToTry, fmt.Sprintf("/dev/rfcomm%d", i))
	}
	for i := range 5 {
		pathsToTry = append(pathsToTry, fmt.Sprintf("/dev/ttyUSB%d", i))
	}

	for _, path := range pathsToTry {
		if _, err := os.Stat(path); err == nil {
			p := NewUSBPrinter(path)
			if err := p.Connect(context.Background()); err == nil {
				p.Close()
				return p, nil
			}
		}
	}

	return nil, fmt.Errorf("no active local or bluetooth printer found")
}
