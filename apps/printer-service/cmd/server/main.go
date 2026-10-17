package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
	"time"

	"printer-service/internal/config"
	"printer-service/internal/domain"
	"printer-service/internal/escpos"
	"printer-service/internal/handler"
	"printer-service/internal/infrastructure/printer"
	"printer-service/internal/middleware"
	"printer-service/internal/pairing"
	"printer-service/internal/registration"
	"printer-service/internal/relay"
	"printer-service/internal/updater"
	"printer-service/internal/usecase"
)

const shutdownGrace = 10 * time.Second

func main() {
	log.SetFlags(log.LstdFlags | log.Lmsgprefix)
	log.SetPrefix("[coaster-printer] ")

	svc, err := buildService(os.Args[1:])
	if err != nil {
		log.Fatalf("Failed to start: %v", err)
	}

	if err := svc.run(); err != nil {
		log.Fatalf("Shut down with an error: %v", err)
	}
}

type service struct {
	cfg      *config.Config
	printUC  *usecase.PrintTicketUseCase
	renderer *escpos.Renderer
	device   domain.Printer
	server   *http.Server

	cfgMu   sync.RWMutex
	ctx     context.Context
	startMu sync.Once
}

func buildService(args []string) (*service, error) {
	cfg, err := config.Parse(args)
	if err != nil {
		return nil, err
	}

	device := buildPrinter(cfg)
	printUC := usecase.NewPrintTicketUseCase(device)
	renderer := escpos.NewRenderer(cfg.PrintWidth, cfg.CodePage)

	svc := &service{cfg: cfg, printUC: printUC, renderer: renderer, device: device}
	svc.server = &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           svc.routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	return svc, nil
}

func (s *service) routes() http.Handler {
	cors := middleware.CORS(s.cfg.AllowedOrigins)
	target := fmt.Sprint(s.device)

	mux := http.NewServeMux()
	mux.Handle("/print", cors(s.printHandler()))
	mux.Handle("/health", cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.NewHealthHandler(updater.CurrentVersion, s.establishmentID(), target).ServeHTTP(w, r)
	})))
	mux.Handle("/printers", cors(handler.NewDiscoveryHandler()))
	mux.Handle("/setup", handler.NewSetupHandler(s))

	return mux
}

func (s *service) printHandler() http.Handler {
	print := handler.NewPrintHandler(s.printUC, s.renderer)
	if s.cfg.JWTSecret != "" {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			middleware.JWT(s.cfg.JWTSecret, s.establishmentID())(print).ServeHTTP(w, r)
		})
	}

	if s.cfg.Insecure {
		return print
	}

	return handler.NewDisabledHandler(
		"The local print endpoint needs -jwt-secret (or -insecure to run without authentication)")
}

func (s *service) establishmentID() string {
	s.cfgMu.RLock()
	defer s.cfgMu.RUnlock()
	return s.cfg.EstablishmentID
}

func (s *service) run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Printf("Coaster print bridge v%s on %s/%s\n", updater.CurrentVersion, runtime.GOOS, runtime.GOARCH)
	log.Printf("Printer: %v (width %d, code page %s)\n", s.device, s.cfg.PrintWidth, s.cfg.CodePage.Name)
	s.warnAboutConfiguration()

	up := updater.NewUpdater(s.cfg.APIURL + "/printer/check-version")
	up.AcquireIdle = s.printUC.AcquireIdle
	up.ReleaseIdle = s.printUC.ReleaseIdle
	go up.Watch(ctx, s.cfg.UpdateInterval)

	s.ctx = ctx
	if !s.Paired() {
		s.pairFromFileName()
	}

	if s.Paired() {
		s.startRelay()
	} else {
		log.Println("No establishment-id/device-key: printing only from the local network.")
	}

	errs := make(chan error, 1)
	go func() {
		log.Printf("Listening on %s\n", s.server.Addr)
		if err := s.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errs <- err
		}
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
		log.Println("Shutting down...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
	defer cancel()

	return s.server.Shutdown(shutdownCtx)
}

func (s *service) startRelay() {
	s.startMu.Do(func() {
		if s.ctx != nil && s.cfg.RelayEnabled() {
			go registration.StartIPRegistration(s.ctx, s.cfg)
			go relay.Run(s.ctx, s.cfg, s.printUC, s.renderer)
		}
	})
}

func (s *service) pairFromFileName() {
	executable, err := os.Executable()
	if err != nil {
		return
	}

	code := pairing.CodeFromName(executable)
	if code == "" {
		log.Println("Not paired yet and no code in the file name. Open http://localhost:" + s.cfg.Port + "/setup to pair.")
		return
	}

	paired, err := pairing.Redeem(s.cfg.APIURL, code)
	if err != nil {
		log.Printf("Could not pair with code %s: %v\n", code, err)
		return
	}

	s.cfgMu.Lock()
	s.cfg.EstablishmentID = paired.EstablishmentID
	s.cfg.DeviceKey = paired.DeviceKey
	s.cfgMu.Unlock()

	if err := pairing.Save(*paired); err != nil {
		log.Printf("Paired, but could not save it next to the binary: %v\n", err)
		return
	}

	log.Printf("Paired with establishment %s. This machine will not need the code again.\n", paired.EstablishmentID)
}

func (s *service) Pair(code string) error {
	paired, err := pairing.Redeem(s.cfg.APIURL, code)
	if err != nil {
		return err
	}

	s.cfgMu.Lock()
	s.cfg.EstablishmentID = paired.EstablishmentID
	s.cfg.DeviceKey = paired.DeviceKey
	s.cfgMu.Unlock()

	if err := pairing.Save(*paired); err != nil {
		return err
	}

	s.startRelay()
	return nil
}

func (s *service) Paired() bool {
	s.cfgMu.RLock()
	defer s.cfgMu.RUnlock()
	return s.cfg.RelayEnabled()
}

func (s *service) warnAboutConfiguration() {
	if s.cfg.JWTSecret != "" {
		if s.cfg.EstablishmentID == "" {
			log.Println("WARNING: -establishment-id is not set, so a token issued for any establishment will be accepted.")
		}
		return
	}

	if s.cfg.Insecure {
		log.Println("WARNING: running with -insecure. Anyone who can reach this port can print.")
		return
	}

	log.Println("Local print endpoint is disabled: no -jwt-secret was provided.")
	log.Println("Set PRINTER_JWT_SECRET to the value the API uses, or pass -insecure to accept unauthenticated requests.")
}

func buildPrinter(cfg *config.Config) domain.Printer {
	if cfg.PrinterType == config.PrinterTypeNetwork {
		return printer.NewNetworkPrinter(cfg.PrinterPath)
	}

	if cfg.PrinterPath != "" {
		return printer.NewUSBPrinter(cfg.PrinterPath)
	}

	return printer.NewAutoPrinter()
}
