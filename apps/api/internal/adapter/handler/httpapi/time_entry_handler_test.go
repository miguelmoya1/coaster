package httpapi

import (
	"errors"
	"net/url"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestParseTimeSheetQuery(t *testing.T) {
	tests := []struct {
		query    string
		userID   string
		from, to string
		messages []string
	}{
		{query: ""},
		{query: "from=2026-08-08&to=2026-08-09&userId=0b8a1b2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b", userID: "0b8a1b2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b", from: "2026-08-08", to: "2026-08-09"},
		{query: "from=8-8-2026", messages: []string{"INVALID_DATE"}},
		{query: "from=", messages: []string{"INVALID_DATE"}},
		{query: "to=2026-08-08&to=2026-08-09", messages: []string{"INVALID_DATE"}},
		{query: "userId=luis", messages: []string{"INVALID_TYPE"}},
		{query: "page=2&from=x&day=1", messages: []string{"property day should not exist", "property page should not exist", "INVALID_DATE"}},
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			values, _ := url.ParseQuery(tt.query)
			query, err := parseTimeSheetQuery(values)

			if tt.messages != nil {
				var reqErr *requestError
				if !errors.As(err, &reqErr) || !slices.Equal(reqErr.validation, tt.messages) {
					t.Fatalf("err = %v, want %v", err, tt.messages)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if query.userID != tt.userID || timeSheetValue(query.from) != tt.from || timeSheetValue(query.to) != tt.to {
				t.Fatalf("query = %+v", query)
			}
		})
	}
}

func timeSheetValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func TestTimeSheetCSV(t *testing.T) {
	occurredAt := domain.NewTime(time.Date(2026, 8, 8, 7, 0, 0, 0, time.UTC))
	actorName := "Marta"
	reason := `Olvidó "fichar"`

	workdays := []domain.Workday{{
		Date: "2026-08-08",
		Entries: []domain.TimeEntry{{
			UserName: "Luis",
			Revisions: []domain.TimeEntryRevision{
				{Type: domain.TimeEntryClockIn, OccurredAt: occurredAt, RecordedAt: occurredAt, Source: domain.TimeEntryFromEmployeeDevice, Action: domain.TimeEntryRecordedAction, ActorID: "luis", Hash: "h1"},
				{Type: domain.TimeEntryClockIn, OccurredAt: occurredAt, RecordedAt: occurredAt, Source: domain.TimeEntryFromEmployeeDevice, Action: domain.TimeEntryAmendedAction, ActorID: "marta", ActorName: &actorName, Reason: &reason, Hash: "h2"},
			},
		}},
	}}

	want := "dia;empleado;marca;hora;origen;accion;motivo;autor;registrado;hash\n" +
		`"2026-08-08";"Luis";"CLOCK_IN";"2026-08-08T07:00:00.000Z";"EMPLOYEE_DEVICE";"RECORDED";"";"luis";"2026-08-08T07:00:00.000Z";"h1"` + "\n" +
		`"2026-08-08";"Luis";"CLOCK_IN";"2026-08-08T07:00:00.000Z";"EMPLOYEE_DEVICE";"AMENDED";"Olvidó ""fichar""";"Marta";"2026-08-08T07:00:00.000Z";"h2"`

	if got := timeSheetCSV(workdays); got != want {
		t.Errorf("got\n%s\nwant\n%s", got, want)
	}

	if got := timeSheetCSV(nil); got != "dia;empleado;marca;hora;origen;accion;motivo;autor;registrado;hash" {
		t.Errorf("empty = %q", got)
	}
}
