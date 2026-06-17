//go:build windows

package printer

import (
	"context"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

type USBPrinter struct {
	PrinterName string // El nombre de la impresora en Windows, ej: "Seypos G80"
	handle      windows.Handle
}

func NewUSBPrinter(identifier string) *USBPrinter {
	return &USBPrinter{PrinterName: identifier}
}

func (u *USBPrinter) Connect(ctx context.Context) error {
	// Cargamos la DLL del spooler de Windows de forma nativa
	modwinspool := windows.NewLazyDLL("winspool.drv")
	procOpenPrinter := modwinspool.NewProc("OpenPrinterW")

	namePtr, err := windows.UTF16PtrFromString(u.PrinterName)
	if err != nil {
		return err
	}

	// Abrimos la conexión con la impresora de Windows
	r1, _, err := procOpenPrinter.Call(
		uintptr(unsafe.Pointer(namePtr)),
		uintptr(unsafe.Pointer(&u.handle)),
		0,
	)
	if r1 == 0 {
		return fmt.Errorf("no se pudo abrir la impresora en Windows: %w", err)
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

	// Estructura necesaria para Windows Spooler (DOC_INFO_1)
	type DOC_INFO_1 struct {
		DocName    *uint16
		OutputFile *uint16
		Datatype   *uint16
	}

	docName, _ := windows.UTF16PtrFromString("RAW_TICKET")
	dataType, _ := windows.UTF16PtrFromString("RAW") // Modo RAW envía los bytes ESC/POS directos
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
