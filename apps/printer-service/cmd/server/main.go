package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"runtime"

	"printer-service/internal/config"
	"printer-service/internal/domain"
	"printer-service/internal/handler"
	"printer-service/internal/infrastructure/printer"
	"printer-service/internal/middleware"
	"printer-service/internal/registration"
	"printer-service/internal/updater"
	"printer-service/internal/usecase"
)

func main() {
	srv, err := BuildServer(os.Args[1:])
	if err != nil {
		log.Fatalf("Failed to build server: %v", err)
	}
	log.Printf("Service ready and listening on %s\n", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("HTTP server error: %v", err)
	}
}

func BuildServer(args []string) (*http.Server, error) {
	cfg, err := config.Parse(args)
	if err != nil {
		return nil, err
	}

	log.Printf("Starting Print Service v%s on %s/%s\n", updater.CurrentVersion, runtime.GOOS, runtime.GOARCH)

	checkURL := cfg.APIURL + "/printer/check-version"
	up := updater.NewUpdater(checkURL)
	log.Printf("Checking for updates at %s...\n", checkURL)
	if err := up.AutoUpdate(); err != nil {
		log.Printf("Could not update (running current version): %v\n", err)
	}

	printerDevice := buildPrinter(cfg)

	if cfg.BarID != "" && cfg.DeviceKey != "" {
		log.Printf("Starting background IP registration loop for bar %s...\n", cfg.BarID)
		go registration.StartIPRegistration(context.Background(), cfg)
	} else {
		log.Println("Background IP registration skipped: bar-id or device-key is empty.")
	}

	printUC := usecase.NewPrintTicketUseCase(printerDevice)
	mux := buildMux(cfg, printUC)

	return &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}, nil
}

func buildPrinter(cfg *config.Config) domain.Printer {
	if cfg.PrinterType == "network" {
		path := cfg.PrinterPath
		if path == "" {
			path = "192.168.1.200:9100"
		}
		return printer.NewNetworkPrinter(path)
	}

	if cfg.PrinterPath != "" {
		return printer.NewUSBPrinter(cfg.PrinterPath)
	}

	log.Println("Searching for available printers (USB/Bluetooth/Serial)...")
	if _, err := printer.AutoDetect(); err != nil {
		log.Printf("Warning: %v. (Will search again upon printing)\n", err)
	} else {
		log.Println("Printer successfully detected and ready to use!")
	}
	return printer.NewAutoPrinter()
}

func buildMux(cfg *config.Config, printUC *usecase.PrintTicketUseCase) http.Handler {
	printHandler := handler.NewPrintHandler(printUC)

	if cfg.JWTSecret != "" {
		printHandler = middleware.JWT(cfg.JWTSecret)(printHandler)
	}

	printHandler = middleware.CORS(cfg.AllowedOrigins)(printHandler)

	mux := http.NewServeMux()
	mux.Handle("/print", printHandler)
	return mux
}
