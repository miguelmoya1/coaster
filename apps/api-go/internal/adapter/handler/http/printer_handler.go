package http

import (
	"context"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
)

type PrinterService interface {
	RedeemPairing(ctx context.Context, code string) (domain.PrinterPairing, error)
	RegisterAddress(ctx context.Context, establishmentID, deviceKey, ipAddress string, port *int) error
	NextJob(ctx context.Context, establishmentID, deviceKey string) (*domain.ClaimedPrintJob, error)
	ReportResult(ctx context.Context, establishmentID, jobID, deviceKey string, result domain.PrintJobResult) error
}

type PrinterReleaseService interface {
	Latest(platform string) (domain.PrinterRelease, error)
	Download(platform, code string) (fs.File, string, error)
}

type PrinterHandler struct {
	printers PrinterService
	releases PrinterReleaseService
}

func NewPrinterHandler(printers PrinterService, releases PrinterReleaseService) *PrinterHandler {
	return &PrinterHandler{printers: printers, releases: releases}
}

func (h *PrinterHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /printer/check-version", h.checkVersion)
	handle(mux, guard, "GET /printer/download", h.download, middleware.SkipSubscriptionCheck())
	handle(mux, guard, "POST /printer/pair", h.pair,
		middleware.SkipSubscriptionCheck(), middleware.Throttle(10, time.Minute))
	handle(mux, guard, "POST /printer/register-ip", h.registerIP)
	handle(mux, guard, "GET /printer/jobs/next", h.nextJob, middleware.SkipThrottle())
	handle(mux, guard, "POST /printer/jobs/{jobId}/result", h.reportResult)
}

type redeemPairingRequest struct {
	Code string `json:"code" validate:"required"`
}

type registerPrinterIPRequest struct {
	EstablishmentID string `json:"establishmentId" validate:"required"`
	IPAddress       string `json:"ipAddress" validate:"required,ip"`
	Port            *int   `json:"port" validate:"omitnil,min=1,max=65535"`
}

type printJobResultRequest struct {
	Status string  `json:"status" validate:"oneof=printed failed"`
	Error  *string `json:"error" validate:"omitnil,max=500"`
}

func (h *PrinterHandler) checkVersion(w http.ResponseWriter, r *http.Request) {
	release, err := h.releases.Latest(r.URL.Query().Get("os"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, release)
}

func (h *PrinterHandler) download(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	binary, filename, err := h.releases.Download(query.Get("os"), query.Get("code"))
	if err != nil {
		writeError(w, err)
		return
	}
	defer binary.Close()

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.WriteHeader(http.StatusOK)

	if _, err := io.Copy(w, binary); err != nil {
		slog.Warn("the bridge download was cut short", "file", filename, "error", err)
	}
}

func (h *PrinterHandler) pair(w http.ResponseWriter, r *http.Request) {
	var input redeemPairingRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	pairing, err := h.printers.RedeemPairing(r.Context(), input.Code)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, pairing)
}

func (h *PrinterHandler) registerIP(w http.ResponseWriter, r *http.Request) {
	var input registerPrinterIPRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.printers.RegisterAddress(r.Context(), input.EstablishmentID, r.Header.Get("X-Device-Key"), input.IPAddress, input.Port)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]bool{"success": true})
}

func (h *PrinterHandler) nextJob(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.URL.Query().Get("establishmentId")
	if establishmentID == "" {
		writeError(w, domain.BadRequest(domain.MessageEstablishmentIDRequired))
		return
	}

	job, err := h.printers.NextJob(r.Context(), establishmentID, r.Header.Get("X-Device-Key"))
	if r.Context().Err() != nil {

		return
	}
	if err != nil {
		writeError(w, err)
		return
	}
	if job == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	writeJSON(w, http.StatusOK, job)
}

func (h *PrinterHandler) reportResult(w http.ResponseWriter, r *http.Request) {
	var input printJobResultRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	establishmentID := r.URL.Query().Get("establishmentId")
	if establishmentID == "" {
		writeError(w, domain.BadRequest(domain.MessageEstablishmentIDRequired))
		return
	}

	result := domain.PrintJobResult{Printed: input.Status == "printed", Error: input.Error}
	err := h.printers.ReportResult(r.Context(), establishmentID, r.PathValue("jobId"), r.Header.Get("X-Device-Key"), result)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
