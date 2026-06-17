package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"runtime"

	"printer-service/internal/domain"
	"printer-service/internal/infrastructure/printer"
	"printer-service/internal/updater"
	"printer-service/internal/usecase"
)

func main() {
	apiURL := flag.String("api-url", "https://api-774617138158.europe-southwest1.run.app/api/v1", "URL base de la API")
	isLocal := flag.Bool("local", false, "Usa localhost:3000 como backend de la API")
	port := flag.String("port", "8080", "Puerto para el servidor HTTP local")
	printerType := flag.String("printer-type", "usb", "Tipo de impresora (usb o network)")
	printerPath := flag.String("printer-path", "", "Ruta o IP de la impresora (ej. 'Seypos G80', '/dev/usb/lp0' o '192.168.1.200:9100')")
	flag.Parse()

	if *isLocal {
		*apiURL = "http://localhost:3000/api/v1"
	}

	log.Printf("Iniciando Servicio de Impresión v%s en %s/%s\n", updater.CurrentVersion, runtime.GOOS, runtime.GOARCH)

	// 1. Ejecutar el módulo de auto-actualización
	checkURL := *apiURL + "/printer/check-version"
	up := updater.NewUpdater(checkURL)
	log.Printf("Buscando actualizaciones en %s...\n", checkURL)
	if err := up.AutoUpdate(); err != nil {
		log.Printf("No se pudo actualizar (ejecutando versión actual): %v\n", err)
	}

	// 2. Inicializar la impresora según la configuración
	var printerDevice domain.Printer

	if *printerType == "network" {
		path := *printerPath
		if path == "" {
			path = "192.168.1.200:9100"
		}
		printerDevice = printer.NewNetworkPrinter(path)
	} else {
		path := *printerPath
		if path == "" {
			if runtime.GOOS == "windows" {
				path = "Seypos G80"
			} else {
				path = "/dev/usb/lp0"
			}
		}
		printerDevice = printer.NewUSBPrinter(path)
	}

	// 3. Lanzar casos de uso
	printUC := usecase.NewPrintTicketUseCase(printerDevice)

	// 4. Servidor HTTP local
	http.HandleFunc("/print", func(w http.ResponseWriter, r *http.Request) {
		// Habilitar CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

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

		// Asumimos que el ticket viene en crudo o JSON. Lo metemos en el dominio.
		// Si es JSON, podríamos hacer Unmarshal. Por simplicidad, tomamos el body entero.
		ticket := domain.Ticket{
			ID:      "manual-print",
			Content: body,
		}

		if err := printUC.Execute(context.Background(), ticket); err != nil {
			log.Printf("Error al imprimir: %v\n", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	log.Printf("Servicio listo y escuchando peticiones en http://localhost:%s\n", *port)
	if err := http.ListenAndServe(":"+*port, nil); err != nil {
		log.Fatalf("Error en el servidor HTTP: %v", err)
	}
}
