package httpapi

import (
	"context"
	"errors"
	"net/http"
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

type fakeTimeEntryService struct {
	clockFn          func(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error)
	currentWorkdayFn func(ctx context.Context, establishmentID, userID string) (*domain.Workday, error)
	timeSheetFn      func(ctx context.Context, establishmentID string, from, to *string, userID string) ([]domain.Workday, error)
	integrityFn      func(ctx context.Context, establishmentID string) (domain.TimeSheetIntegrity, error)
	createManualFn   func(ctx context.Context, establishmentID string, actor *domain.User, input domain.ManualTimeEntryInput) (domain.TimeEntry, error)
	amendFn          func(ctx context.Context, establishmentID, entryID string, actor *domain.User, input domain.AmendTimeEntryInput) (domain.TimeEntry, error)
	voidFn           func(ctx context.Context, establishmentID, entryID string, actor *domain.User, reason string) (domain.TimeEntry, error)
}

func (f *fakeTimeEntryService) Clock(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error) {
	if f.clockFn != nil {
		return f.clockFn(ctx, establishmentID, actor, input)
	}
	return domain.TimeEntry{}, nil
}

func (f *fakeTimeEntryService) CurrentWorkday(ctx context.Context, establishmentID, userID string) (*domain.Workday, error) {
	if f.currentWorkdayFn != nil {
		return f.currentWorkdayFn(ctx, establishmentID, userID)
	}
	return nil, nil
}

func (f *fakeTimeEntryService) TimeSheet(ctx context.Context, establishmentID string, from, to *string, userID string) ([]domain.Workday, error) {
	if f.timeSheetFn != nil {
		return f.timeSheetFn(ctx, establishmentID, from, to, userID)
	}
	return nil, nil
}

func (f *fakeTimeEntryService) Integrity(ctx context.Context, establishmentID string) (domain.TimeSheetIntegrity, error) {
	if f.integrityFn != nil {
		return f.integrityFn(ctx, establishmentID)
	}
	return domain.TimeSheetIntegrity{Valid: true}, nil
}

func (f *fakeTimeEntryService) CreateManual(ctx context.Context, establishmentID string, actor *domain.User, input domain.ManualTimeEntryInput) (domain.TimeEntry, error) {
	if f.createManualFn != nil {
		return f.createManualFn(ctx, establishmentID, actor, input)
	}
	return domain.TimeEntry{}, nil
}

func (f *fakeTimeEntryService) Amend(ctx context.Context, establishmentID, entryID string, actor *domain.User, input domain.AmendTimeEntryInput) (domain.TimeEntry, error) {
	if f.amendFn != nil {
		return f.amendFn(ctx, establishmentID, entryID, actor, input)
	}
	return domain.TimeEntry{}, nil
}

func (f *fakeTimeEntryService) Void(ctx context.Context, establishmentID, entryID string, actor *domain.User, reason string) (domain.TimeEntry, error) {
	if f.voidFn != nil {
		return f.voidFn(ctx, establishmentID, entryID, actor, reason)
	}
	return domain.TimeEntry{}, nil
}

func TestTimeEntryHandlerRoutes(t *testing.T) {
	svc := &fakeTimeEntryService{}
	guard := testGuard(fakeAccess{platformRole: domain.RoleAdmin})
	mux := http.NewServeMux()
	NewTimeEntryHandler(svc).RegisterRoutes(mux, guard)

	signedIn := map[string]string{"Authorization": "Bearer good"}

	// 1. Clock success
	svc.clockFn = func(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error) {
		return domain.TimeEntry{ID: "entry-1"}, nil
	}
	resp := send(mux, "POST", "/api/v1/establishments/e1/time-entries/clock", `{"type":"CLOCK_IN"}`, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("clock status = %d, want 201", resp.Code)
	}

	// Clock decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/clock", `{"type":"INVALID"}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("clock invalid status = %d, want 400", resp.Code)
	}

	// Clock service error
	svc.clockFn = func(ctx context.Context, establishmentID string, actor *domain.User, input domain.ClockInput) (domain.TimeEntry, error) {
		return domain.TimeEntry{}, domain.Conflict("ALREADY_CLOCKED_IN")
	}
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/clock", `{"type":"CLOCK_IN"}`, signedIn)
	if resp.Code != http.StatusConflict {
		t.Errorf("clock conflict status = %d, want 409", resp.Code)
	}

	// 2. myCurrentWorkday success
	svc.currentWorkdayFn = func(ctx context.Context, establishmentID, userID string) (*domain.Workday, error) {
		return &domain.Workday{Date: "2026-09-27"}, nil
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/me/current", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("myCurrentWorkday status = %d, want 200", resp.Code)
	}

	// myCurrentWorkday error
	svc.currentWorkdayFn = func(ctx context.Context, establishmentID, userID string) (*domain.Workday, error) {
		return nil, domain.NotFound("ESTABLISHMENT_NOT_FOUND")
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/me/current", "", signedIn)
	if resp.Code != http.StatusNotFound {
		t.Errorf("myCurrentWorkday error status = %d, want 404", resp.Code)
	}

	// 3. myWorkdays success
	svc.timeSheetFn = func(ctx context.Context, establishmentID string, from, to *string, userID string) ([]domain.Workday, error) {
		return []domain.Workday{{Date: "2026-09-27"}}, nil
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/me?from=2026-09-01&to=2026-09-30", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("myWorkdays status = %d, want 200", resp.Code)
	}

	// myWorkdays bad query
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/me?from=bad-date", "", signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("myWorkdays bad query status = %d, want 400", resp.Code)
	}

	// 4. workdays success
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries?from=2026-09-01&to=2026-09-30", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("workdays status = %d, want 200", resp.Code)
	}

	// 5. export success
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/export?from=2026-09-01&to=2026-09-30", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("export status = %d, want 200", resp.Code)
	}
	if ct := resp.Header().Get("Content-Type"); ct != "text/csv; charset=utf-8" {
		t.Errorf("export content-type = %q", ct)
	}

	// 6. integrity success
	svc.integrityFn = func(ctx context.Context, establishmentID string) (domain.TimeSheetIntegrity, error) {
		return domain.TimeSheetIntegrity{Valid: true}, nil
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/time-entries/integrity", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("integrity status = %d, want 200", resp.Code)
	}

	// 7. create manual success
	validUUID := "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
	svc.createManualFn = func(ctx context.Context, establishmentID string, actor *domain.User, input domain.ManualTimeEntryInput) (domain.TimeEntry, error) {
		return domain.TimeEntry{ID: "new-manual"}, nil
	}
	createBody := `{"userId":"` + validUUID + `","type":"CLOCK_IN","occurredAt":"2026-09-27T08:00:00Z","reason":"Forgot to punch"}`
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries", createBody, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("create status = %d, want 201; body = %s", resp.Code, resp.Body.String())
	}

	// create manual decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries", `{"userId":"invalid"}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("create manual decode error status = %d, want 400", resp.Code)
	}

	// 8. amend success
	svc.amendFn = func(ctx context.Context, establishmentID, entryID string, actor *domain.User, input domain.AmendTimeEntryInput) (domain.TimeEntry, error) {
		return domain.TimeEntry{ID: entryID}, nil
	}
	amendBody := `{"occurredAt":"2026-09-27T08:30:00Z","reason":"Adjusted time"}`
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/entry-1/amend", amendBody, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("amend status = %d, want 201", resp.Code)
	}

	// amend decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/entry-1/amend", `{"reason":"short"}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("amend decode error status = %d, want 400", resp.Code)
	}

	// 9. void success
	svc.voidFn = func(ctx context.Context, establishmentID, entryID string, actor *domain.User, reason string) (domain.TimeEntry, error) {
		return domain.TimeEntry{ID: entryID}, nil
	}
	voidBody := `{"reason":"Duplicated entry"}`
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/entry-1/void", voidBody, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("void status = %d, want 201", resp.Code)
	}

	// void decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/time-entries/entry-1/void", `{"reason":"no"}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("void decode error status = %d, want 400", resp.Code)
	}
}
