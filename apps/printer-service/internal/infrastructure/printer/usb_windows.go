
package printer

import (
	"context"
	"fmt"
	"runtime"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	winspool = windows.NewLazySystemDLL("winspool.drv")

	procOpenPrinter      = winspool.NewProc("OpenPrinterW")
	procClosePrinter     = winspool.NewProc("ClosePrinter")
	procStartDocPrinter  = winspool.NewProc("StartDocPrinterW")
	procEndDocPrinter    = winspool.NewProc("EndDocPrinter")
	procStartPagePrinter = winspool.NewProc("StartPagePrinter")
	procEndPagePrinter   = winspool.NewProc("EndPagePrinter")
	procWritePrinter     = winspool.NewProc("WritePrinter")
	procEnumPrinters     = winspool.NewProc("EnumPrintersW")
	procGetDefaultPrint  = winspool.NewProc("GetDefaultPrinterW")
)

type docInfo1 struct {
	DocName    *uint16
	OutputFile *uint16
	Datatype   *uint16
}

type printerInfo4 struct {
	PrinterName *uint16
	ServerName  *uint16
	Attributes  uint32
}

const (
	printerEnumLocal       = 0x00000002
	printerEnumConnections = 0x00000004
)

type USBPrinter struct {
	PrinterName string
	handle      windows.Handle
}

func NewUSBPrinter(identifier string) *USBPrinter {
	return &USBPrinter{PrinterName: identifier}
}

func (u *USBPrinter) Connect(ctx context.Context) error {
	namePtr, err := windows.UTF16PtrFromString(u.PrinterName)
	if err != nil {
		return fmt.Errorf("invalid printer name %q: %w", u.PrinterName, err)
	}

	var handle windows.Handle
	r1, _, callErr := procOpenPrinter.Call(
		uintptr(unsafe.Pointer(namePtr)),
		uintptr(unsafe.Pointer(&handle)),
		0,
	)
	if r1 == 0 {
		return fmt.Errorf("could not open Windows printer %q: %w", u.PrinterName, callErr)
	}

	u.handle = handle
	return nil
}

func (u *USBPrinter) Write(b []byte) (int, error) {
	if u.handle == 0 {
		return 0, fmt.Errorf("printer %q not connected", u.PrinterName)
	}
	if len(b) == 0 {
		return 0, nil
	}

	docName, err := windows.UTF16PtrFromString("Coaster ticket")
	if err != nil {
		return 0, err
	}
	dataType, err := windows.UTF16PtrFromString("RAW")
	if err != nil {
		return 0, err
	}
	di := docInfo1{DocName: docName, Datatype: dataType}

	r1, _, callErr := procStartDocPrinter.Call(uintptr(u.handle), 1, uintptr(unsafe.Pointer(&di)))
	runtime.KeepAlive(di)
	runtime.KeepAlive(docName)
	runtime.KeepAlive(dataType)
	if r1 == 0 {
		return 0, fmt.Errorf("StartDocPrinter failed for %q: %w", u.PrinterName, callErr)
	}
	defer procEndDocPrinter.Call(uintptr(u.handle))

	if r1, _, callErr = procStartPagePrinter.Call(uintptr(u.handle)); r1 == 0 {
		return 0, fmt.Errorf("StartPagePrinter failed for %q: %w", u.PrinterName, callErr)
	}
	defer procEndPagePrinter.Call(uintptr(u.handle))

	total := 0
	for total < len(b) {
		var written uint32
		r1, _, callErr = procWritePrinter.Call(
			uintptr(u.handle),
			uintptr(unsafe.Pointer(&b[total])),
			uintptr(len(b)-total),
			uintptr(unsafe.Pointer(&written)),
		)
		if r1 == 0 {
			return total, fmt.Errorf("WritePrinter failed for %q: %w", u.PrinterName, callErr)
		}
		if written == 0 {
			return total, fmt.Errorf("printer %q accepted no data", u.PrinterName)
		}
		total += int(written)
	}

	return total, nil
}

func (u *USBPrinter) Close() error {
	if u.handle == 0 {
		return nil
	}
	r1, _, callErr := procClosePrinter.Call(uintptr(u.handle))
	u.handle = 0
	if r1 == 0 {
		return fmt.Errorf("ClosePrinter failed: %w", callErr)
	}
	return nil
}

func (u *USBPrinter) String() string {
	return "windows:" + u.PrinterName
}

var virtualPrinters = []string{
	"microsoft print to pdf",
	"microsoft xps document writer",
	"onenote",
	"fax",
	"pdfcreator",
	"adobe pdf",
	"send to onenote",
}

func isVirtualPrinter(name string) bool {
	lower := strings.ToLower(name)
	for _, virtual := range virtualPrinters {
		if strings.Contains(lower, virtual) {
			return true
		}
	}
	return false
}

func LocalCandidates() []string {
	var candidates []string
	seen := map[string]bool{}

	add := func(name string) {
		if name == "" || seen[name] || isVirtualPrinter(name) {
			return
		}
		seen[name] = true
		candidates = append(candidates, name)
	}

	add(defaultPrinterName())
	for _, name := range installedPrinters() {
		add(name)
	}

	return candidates
}

func defaultPrinterName() string {
	var size uint32
	procGetDefaultPrint.Call(0, uintptr(unsafe.Pointer(&size)))
	if size == 0 {
		return ""
	}

	buf := make([]uint16, size)
	r1, _, _ := procGetDefaultPrint.Call(
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&size)),
	)
	if r1 == 0 {
		return ""
	}
	return windows.UTF16ToString(buf)
}

func installedPrinters() []string {
	const level = 4
	flags := uintptr(printerEnumLocal | printerEnumConnections)

	var needed, returned uint32
	procEnumPrinters.Call(flags, 0, level, 0, 0,
		uintptr(unsafe.Pointer(&needed)), uintptr(unsafe.Pointer(&returned)))
	if needed == 0 {
		return nil
	}

	buf := make([]byte, needed)
	r1, _, _ := procEnumPrinters.Call(flags, 0, level,
		uintptr(unsafe.Pointer(&buf[0])), uintptr(needed),
		uintptr(unsafe.Pointer(&needed)), uintptr(unsafe.Pointer(&returned)))
	if r1 == 0 || returned == 0 {
		return nil
	}

	infos := unsafe.Slice((*printerInfo4)(unsafe.Pointer(&buf[0])), returned)
	names := make([]string, 0, returned)
	for _, info := range infos {
		if info.PrinterName != nil {
			names = append(names, windows.UTF16PtrToString(info.PrinterName))
		}
	}
	runtime.KeepAlive(buf)
	return names
}

func localKind(string) Kind {
	return KindUSB
}

func AutoDetectOS() (*USBPrinter, error) {
	for _, name := range LocalCandidates() {
		p := NewUSBPrinter(name)
		if err := p.Connect(context.Background()); err != nil {
			continue
		}
		if err := p.Close(); err != nil {
			continue
		}
		return p, nil
	}

	return nil, fmt.Errorf("no usable Windows printer found (virtual printers such as Microsoft Print to PDF are ignored)")
}
