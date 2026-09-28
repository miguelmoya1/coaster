package http

import (
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type PrinterConnectionHandler struct {
	printers ports.PrinterService
}

func NewPrinterConnectionHandler(printers ports.PrinterService) *PrinterConnectionHandler {
	return &PrinterConnectionHandler{printers: printers}
}

func (h *PrinterConnectionHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	orders := middleware.Modules(domain.ModuleOrders)
	view := middleware.Permissions(domain.PermissionViewPrinter)
	manage := middleware.Permissions(domain.PermissionManagePrinter)

	handle(mux, guard, "POST /establishments/{establishmentId}/printer/jobs", h.print, view, orders)
	handle(mux, guard, "GET /establishments/{establishmentId}/printer/jobs/{jobId}", h.job, view, orders)
	handle(mux, guard, "GET /establishments/{establishmentId}/printer/connection", h.connection, view, orders)
	handle(mux, guard, "GET /establishments/{establishmentId}/printer/status", h.status, view, orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/printer/pairing", h.issuePairing, manage, orders)
	handle(mux, guard, "POST /establishments/{establishmentId}/printer/device-key", h.generateDeviceKey, manage, orders)
}

type printTicketRequest struct {
	Type              string                    `json:"type" validate:"oneof=order raw"`
	EstablishmentName *string                   `json:"establishmentName" validate:"omitnil,max=60"`
	Table             *string                   `json:"table" validate:"omitnil,max=40"`
	Date              *string                   `json:"date" validate:"omitnil,max=40"`
	Items             *[]printTicketItemRequest `json:"items" validate:"omitnil,max=200,dive"`
	Total             *string                   `json:"total" validate:"omitnil,max=20"`
	Currency          *string                   `json:"currency" validate:"omitnil,max=8"`
	Notes             *string                   `json:"notes" validate:"omitnil,max=500"`
	RawText           *string                   `json:"rawText" validate:"omitnil,max=4000"`
}

type printTicketItemRequest struct {
	Name     string `json:"name" validate:"max=120"`
	Quantity int    `json:"quantity" validate:"min=1"`
	Price    string `json:"price" validate:"max=20"`
	Total    string `json:"total" validate:"max=20"`
}

func (h *PrinterConnectionHandler) print(w http.ResponseWriter, r *http.Request) {
	var input printTicketRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ticket := domain.PrintTicket{
		Type:              input.Type,
		EstablishmentName: input.EstablishmentName,
		Table:             input.Table,
		Date:              input.Date,
		Total:             input.Total,
		Currency:          input.Currency,
		Notes:             input.Notes,
		RawText:           input.RawText,
	}
	if input.Items != nil {
		items := make([]domain.PrintTicketItem, 0, len(*input.Items))
		for _, item := range *input.Items {
			items = append(items, domain.PrintTicketItem{Name: item.Name, Quantity: item.Quantity, Price: item.Price, Total: item.Total})
		}
		ticket.Items = &items
	}

	queued, err := h.printers.Enqueue(r.Context(), r.PathValue("establishmentId"), ticket)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, queued)
}

func (h *PrinterConnectionHandler) job(w http.ResponseWriter, r *http.Request) {
	job, err := h.printers.Job(r.Context(), r.PathValue("establishmentId"), r.PathValue("jobId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, job)
}

func (h *PrinterConnectionHandler) connection(w http.ResponseWriter, r *http.Request) {
	connection, err := h.printers.Connection(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, connection)
}

func (h *PrinterConnectionHandler) status(w http.ResponseWriter, r *http.Request) {
	status, err := h.printers.Status(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, status)
}

func (h *PrinterConnectionHandler) issuePairing(w http.ResponseWriter, r *http.Request) {
	code, err := h.printers.IssuePairing(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, code)
}

func (h *PrinterConnectionHandler) generateDeviceKey(w http.ResponseWriter, r *http.Request) {
	deviceKey, err := h.printers.GenerateDeviceKey(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, deviceKey)
}
