package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"runtime"

	"printer-service/internal/domain"
	"printer-service/internal/infrastructure/printer"
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
	fs := flag.NewFlagSet("server", flag.ContinueOnError)
	apiURL := fs.String("api-url", "https://api-774617138158.europe-southwest1.run.app/api/v1", "URL base de la API")
	isLocal := fs.Bool("local", false, "Usa localhost:3000 como backend de la API")
	port := fs.String("port", "8080", "Puerto para el servidor HTTP local")
	printerType := fs.String("printer-type", "usb", "Tipo de impresora (usb o network)")
	printerPath := fs.String("printer-path", "", "Ruta o IP de la impresora")
	
	if err := fs.Parse(args); err != nil {
		return nil, err
	}

	if *isLocal {
		*apiURL = "http://localhost:3000/api/v1"
	}

	log.Printf("Starting Print Service v%s on %s/%s\n", updater.CurrentVersion, runtime.GOOS, runtime.GOARCH)

	checkURL := *apiURL + "/printer/check-version"
	up := updater.NewUpdater(checkURL)
	log.Printf("Checking for updates at %s...\n", checkURL)
	if err := up.AutoUpdate(); err != nil {
		log.Printf("Could not update (running current version): %v\n", err)
	}

	var printerDevice domain.Printer

	if *printerType == "network" {
		path := *printerPath
		if path == "" {
			path = "192.168.1.200:9100"
		}
		printerDevice = printer.NewNetworkPrinter(path)
	} else {
		if *printerPath != "" {
			printerDevice = printer.NewUSBPrinter(*printerPath)
		} else {
			printerDevice = printer.NewAutoPrinter()
			
			log.Println("Searching for available printers (USB/Bluetooth/Serial)...")
			if _, err := printer.AutoDetect(); err != nil {
				log.Printf("Warning: %v. (Will search again upon printing)\n", err)
			} else {
				log.Println("Printer successfully detected and ready to use!")
			}
		}
	}

	printUC := usecase.NewPrintTicketUseCase(printerDevice)
	mux := SetupHandler(printUC)

	return &http.Server{
		Addr:    ":" + *port,
		Handler: mux,
	}, nil
}

func SetupHandler(printUC *usecase.PrintTicketUseCase) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/print", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}

		ticket := domain.Ticket{
			ID:      "manual-print",
			Content: body,
		}

		if err := printUC.Execute(context.Background(), ticket); err != nil {
			log.Printf("Print error: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Could not connect to printer",
				"details": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	return mux
}
