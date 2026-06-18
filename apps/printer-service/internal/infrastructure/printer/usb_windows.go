//go:build windows

package printer

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

type USBPrinter struct {
	PrinterName string
	handle      windows.Handle
}

func NewUSBPrinter(identifier string) *USBPrinter {
	return &USBPrinter{PrinterName: identifier}
}

func (u *USBPrinter) Connect(ctx context.Context) error {
	modwinspool := windows.NewLazyDLL("winspool.drv")
	procOpenPrinter := modwinspool.NewProc("OpenPrinterW")

	namePtr, err := windows.UTF16PtrFromString(u.PrinterName)
	if err != nil {
		return err
	}

	r1, _, err := procOpenPrinter.Call(
		uintptr(unsafe.Pointer(namePtr)),
		uintptr(unsafe.Pointer(&u.handle)),
		0,
	)
	if r1 == 0 {
		return fmt.Errorf("could not open printer in Windows: %w", err)
	}
	return nil
}

func (u *USBPrinter) Write(b []byte) (int, error) {
	modwinspool := windows.NewLazyDLL("winspool.drv")
	procStartDocPrinter := modwinspool.NewProc("StartDocPrinterW")
	procStartPagePrinter := modwinspool.NewProc("StartPagePrinter")
	procWritePrinter := modwinspool.NewProc("WritePrinter")
	procEndPagePrinter := modwinspool.NewProc("EndPagePrinter")
	procEndDocPrinter := modwinspool.NewProc("EndDocPrinter")

	type DOC_INFO_1 struct {
		DocName    *uint16
		OutputFile *uint16
		Datatype   *uint16
	}

	docName, _ := windows.UTF16PtrFromString("RAW_TICKET")
	dataType, _ := windows.UTF16PtrFromString("RAW")
	di := DOC_INFO_1{DocName: docName, OutputFile: nil, Datatype: dataType}

	procStartDocPrinter.Call(uintptr(u.handle), 1, uintptr(unsafe.Pointer(&di)))
	procStartPagePrinter.Call(uintptr(u.handle))

	var written uint32
	procWritePrinter.Call(
		uintptr(u.handle),
		uintptr(unsafe.Pointer(&b[0])),
		uintptr(len(b)),
		uintptr(unsafe.Pointer(&written)),
	)

	procEndPagePrinter.Call(uintptr(u.handle))
	procEndDocPrinter.Call(uintptr(u.handle))

	return int(written), nil
}

func (u *USBPrinter) Close() error {
	if u.handle != 0 {
		modwinspool := windows.NewLazyDLL("winspool.drv")
		procClosePrinter := modwinspool.NewProc("ClosePrinter")
		procClosePrinter.Call(uintptr(u.handle))
	}
	return nil
}

func AutoDetectOS() (*USBPrinter, error) {
	for i := range 10 {
		comPort := fmt.Sprintf("COM%d", i)
		p := NewUSBPrinter(comPort)
		if err := p.Connect(context.Background()); err == nil {
			p.Close()
			return p, nil
		}
	}

	cmd := exec.Command("powershell", "-Command", "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name")
	out, err := cmd.Output()
	if err == nil {
		for line := range strings.SplitSeq(string(out), "\n") {
			name := strings.TrimSpace(line)
			if name == "" {
				continue
			}
			p := NewUSBPrinter(name)
			if err := p.Connect(context.Background()); err == nil {
				p.Close()
				return p, nil
			}
		}
	}

	return nil, fmt.Errorf("no Windows printer or active COM port found")
}
