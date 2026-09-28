package httpapi

import (
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type TimeEntryHandler struct {
	entries ports.TimeEntryService
}

func NewTimeEntryHandler(entries ports.TimeEntryService) *TimeEntryHandler {
	return &TimeEntryHandler{entries: entries}
}

func (h *TimeEntryHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	const base = "/establishments/{establishmentId}/time-entries"

	handle(mux, guard, "POST "+base+"/clock", h.clock,
		middleware.SkipSubscriptionCheck(), middleware.Permissions(domain.PermissionClockIn))
	handle(mux, guard, "GET "+base+"/me/current", h.myCurrentWorkday,
		middleware.SkipSubscriptionCheck(), middleware.Permissions(domain.PermissionClockIn))
	handle(mux, guard, "GET "+base+"/me", h.myWorkdays, middleware.Permissions())
	handle(mux, guard, "GET "+base, h.workdays, middleware.Permissions(domain.PermissionViewTimeEntries))
	handle(mux, guard, "GET "+base+"/export", h.export, middleware.Permissions(domain.PermissionViewTimeEntries))
	handle(mux, guard, "GET "+base+"/integrity", h.integrity, middleware.Permissions(domain.PermissionManageTimeEntries))
	handle(mux, guard, "POST "+base, h.create, middleware.Permissions(domain.PermissionManageTimeEntries))
	handle(mux, guard, "POST "+base+"/{entryId}/amend", h.amend, middleware.Permissions(domain.PermissionAmendOwnTimeEntry))
	handle(mux, guard, "POST "+base+"/{entryId}/void", h.void, middleware.Permissions(domain.PermissionManageTimeEntries))
}

type clockRequest struct {
	Type      domain.TimeEntryType `json:"type" validate:"oneof=CLOCK_IN BREAK_START BREAK_END CLOCK_OUT" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Latitude  *float64             `json:"latitude" validate:"omitnil,latitude" msg:"latitude=INVALID_TYPE,type=INVALID_TYPE"`
	Longitude *float64             `json:"longitude" validate:"omitnil,longitude" msg:"longitude=INVALID_TYPE,type=INVALID_TYPE"`
}

type createTimeEntryRequest struct {
	UserID     string               `json:"userId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	Type       domain.TimeEntryType `json:"type" validate:"oneof=CLOCK_IN BREAK_START BREAK_END CLOCK_OUT" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	OccurredAt string               `json:"occurredAt" validate:"iso8601" msg:"iso8601=INVALID_DATE,type=INVALID_DATE"`
	Reason     string               `json:"reason" validate:"min=5,max=500" msg:"min=TIME_ENTRY_REASON_REQUIRED,max=MAX_LENGTH,type=INVALID_TYPE"`
}

type amendTimeEntryRequest struct {
	OccurredAt string `json:"occurredAt" validate:"iso8601" msg:"iso8601=INVALID_DATE,type=INVALID_DATE"`
	Reason     string `json:"reason" validate:"min=5,max=500" msg:"min=TIME_ENTRY_REASON_REQUIRED,max=MAX_LENGTH,type=INVALID_TYPE"`
}

type voidTimeEntryRequest struct {
	Reason string `json:"reason" validate:"min=5,max=500" msg:"min=TIME_ENTRY_REASON_REQUIRED,max=MAX_LENGTH,type=INVALID_TYPE"`
}

type timeSheetQuery struct {
	userID string
	from   *string
	to     *string
}

var isoDatePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

func parseTimeSheetQuery(values url.Values) (timeSheetQuery, error) {
	known := []string{"userId", "from", "to"}
	var unknown, messages []string

	for key := range values {
		if !slices.Contains(known, key) {
			unknown = append(unknown, "property "+key+" should not exist")
		}
	}
	slices.Sort(unknown)

	var query timeSheetQuery

	if values.Has("userId") {
		userID := values["userId"]
		if len(userID) != 1 || validate.Var(userID[0], "uuid4") != nil {
			messages = append(messages, domain.CodeInvalidType)
		} else {
			query.userID = userID[0]
		}
	}

	for _, field := range []struct {
		name string
		dest **string
	}{{"from", &query.from}, {"to", &query.to}} {
		if !values.Has(field.name) {
			continue
		}

		value := values[field.name]
		if len(value) != 1 || !isoDatePattern.MatchString(value[0]) {
			messages = append(messages, domain.CodeInvalidDate)
			continue
		}
		*field.dest = &value[0]
	}

	if len(unknown) > 0 || len(messages) > 0 {
		return timeSheetQuery{}, validationFailed(append(unknown, messages...))
	}

	return query, nil
}

func (h *TimeEntryHandler) clock(w http.ResponseWriter, r *http.Request) {
	var input clockRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	entry, err := h.entries.Clock(ctx, r.PathValue("establishmentId"), middleware.CurrentUser(ctx), domain.ClockInput{
		Type:      input.Type,
		Latitude:  input.Latitude,
		Longitude: input.Longitude,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, entry)
}

func (h *TimeEntryHandler) myCurrentWorkday(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workday, err := h.entries.CurrentWorkday(ctx, r.PathValue("establishmentId"), middleware.CurrentUser(ctx).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, workday)
}

func (h *TimeEntryHandler) myWorkdays(w http.ResponseWriter, r *http.Request) {
	query, err := parseTimeSheetQuery(r.URL.Query())
	if err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	workdays, err := h.entries.TimeSheet(ctx, r.PathValue("establishmentId"), query.from, query.to, middleware.CurrentUser(ctx).ID)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, workdays)
}

func (h *TimeEntryHandler) workdays(w http.ResponseWriter, r *http.Request) {
	query, err := parseTimeSheetQuery(r.URL.Query())
	if err != nil {
		writeError(w, err)
		return
	}

	workdays, err := h.entries.TimeSheet(r.Context(), r.PathValue("establishmentId"), query.from, query.to, query.userID)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, workdays)
}

func (h *TimeEntryHandler) export(w http.ResponseWriter, r *http.Request) {
	query, err := parseTimeSheetQuery(r.URL.Query())
	if err != nil {
		writeError(w, err)
		return
	}

	workdays, err := h.entries.TimeSheet(r.Context(), r.PathValue("establishmentId"), query.from, query.to, query.userID)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="registro-horario.csv"`)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(timeSheetCSV(workdays)))
}

func (h *TimeEntryHandler) integrity(w http.ResponseWriter, r *http.Request) {
	integrity, err := h.entries.Integrity(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, integrity)
}

func (h *TimeEntryHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createTimeEntryRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	entry, err := h.entries.CreateManual(ctx, r.PathValue("establishmentId"), middleware.CurrentUser(ctx), domain.ManualTimeEntryInput{
		UserID:     input.UserID,
		Type:       input.Type,
		OccurredAt: input.OccurredAt,
		Reason:     input.Reason,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, entry)
}

func (h *TimeEntryHandler) amend(w http.ResponseWriter, r *http.Request) {
	var input amendTimeEntryRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	entry, err := h.entries.Amend(ctx, r.PathValue("establishmentId"), r.PathValue("entryId"), middleware.CurrentUser(ctx), domain.AmendTimeEntryInput{
		OccurredAt: input.OccurredAt,
		Reason:     input.Reason,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, entry)
}

func (h *TimeEntryHandler) void(w http.ResponseWriter, r *http.Request) {
	var input voidTimeEntryRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	ctx := r.Context()
	entry, err := h.entries.Void(ctx, r.PathValue("establishmentId"), r.PathValue("entryId"), middleware.CurrentUser(ctx), input.Reason)
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, entry)
}

var timeSheetHeaders = []string{"dia", "empleado", "marca", "hora", "origen", "accion", "motivo", "autor", "registrado", "hash"}

func csvField(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func timeSheetCSV(workdays []domain.Workday) string {
	rows := []string{strings.Join(timeSheetHeaders, ";")}

	for _, workday := range workdays {
		for _, entry := range workday.Entries {
			for _, revision := range entry.Revisions {
				reason := ""
				if revision.Reason != nil {
					reason = *revision.Reason
				}

				author := revision.ActorID
				if revision.ActorName != nil {
					author = *revision.ActorName
				}

				fields := []string{
					workday.Date,
					entry.UserName,
					string(revision.Type),
					domain.FormatISO(revision.OccurredAt.Time),
					string(revision.Source),
					string(revision.Action),
					reason,
					author,
					domain.FormatISO(revision.RecordedAt.Time),
					revision.Hash,
				}

				quoted := make([]string, 0, len(fields))
				for _, field := range fields {
					quoted = append(quoted, csvField(field))
				}
				rows = append(rows, strings.Join(quoted, ";"))
			}
		}
	}

	return strings.Join(rows, "\n")
}
