
package printer

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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
		return fmt.Errorf("could not open printer device %s: %w", u.DevicePath, err)
	}
	u.file = f
	return nil
}

func (u *USBPrinter) Write(b []byte) (int, error) {
	if u.file == nil {
		return 0, fmt.Errorf("printer device %s not connected", u.DevicePath)
	}
	return u.file.Write(b)
}

func (u *USBPrinter) Close() error {
	if u.file == nil {
		return nil
	}
	err := u.file.Close()
	u.file = nil
	return err
}

func (u *USBPrinter) String() string {
	return "device:" + u.DevicePath
}

var devicePatterns = []string{
	"/dev/usb/lp*",
	"/dev/lp*",
	"/dev/rfcomm*",
	"/dev/ttyUSB*",
	"/dev/ttyACM*",
}

func LocalCandidates() []string {
	var candidates []string
	for _, pattern := range devicePatterns {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}
		candidates = append(candidates, matches...)
	}
	return candidates
}

func localKind(path string) Kind {
	switch {
	case strings.HasPrefix(path, "/dev/rfcomm"):
		return KindBluetooth
	case strings.HasPrefix(path, "/dev/ttyUSB"), strings.HasPrefix(path, "/dev/ttyACM"):
		return KindSerial
	default:
		return KindUSB
	}
}

func AutoDetectOS() (*USBPrinter, error) {
	for _, path := range LocalCandidates() {
		p := NewUSBPrinter(path)
		if err := p.Connect(context.Background()); err != nil {
			continue
		}
		if err := p.Close(); err != nil {
			continue
		}
		return p, nil
	}

	return nil, fmt.Errorf("no local, serial or bluetooth printer found (looked in %v)", devicePatterns)
}
