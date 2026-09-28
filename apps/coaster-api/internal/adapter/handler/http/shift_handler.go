package http

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type ShiftHandler struct {
	shifts ports.ShiftService
}

func NewShiftHandler(shifts ports.ShiftService) *ShiftHandler {
	return &ShiftHandler{shifts: shifts}
}

func (h *ShiftHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/shifts", h.list,
		middleware.Permissions(domain.PermissionViewShifts))
	handle(mux, guard, "POST /establishments/{establishmentId}/shifts", h.create,
		middleware.Permissions(domain.PermissionCreateShift))
	handle(mux, guard, "DELETE /establishments/{establishmentId}/shifts/{shiftId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteShift))
}

type createShiftRequest struct {
	UserID    string  `json:"userId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	StartTime string  `json:"startTime" validate:"required" msg:"required=REQUIRED,type=INVALID_DATE"`
	EndTime   string  `json:"endTime" validate:"required" msg:"required=REQUIRED,type=INVALID_DATE"`
	Notes     *string `json:"notes" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

func (h *ShiftHandler) list(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	shifts, err := h.shifts.List(r.Context(), r.PathValue("establishmentId"), query.Get("startDate"), query.Get("endDate"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, shifts)
}

func (h *ShiftHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createShiftRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.shifts.Create(r.Context(), r.PathValue("establishmentId"), domain.CreateShiftInput{
		UserID:    input.UserID,
		StartTime: input.StartTime,
		EndTime:   input.EndTime,
		Notes:     input.Notes,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *ShiftHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.shifts.Delete(r.Context(), r.PathValue("establishmentId"), r.PathValue("shiftId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
