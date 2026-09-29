package httpapi

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

type tillCloses struct {
	closed        *domain.NewCashClose
	voided        *domain.VoidCashClose
	closedBetween []time.Time
}

var (
	tillClosedAt = domain.NewTime(time.Date(2026, 9, 23, 23, 40, 0, 0, time.UTC))
	tillVoidedAt = domain.NewTime(time.Date(2026, 9, 25, 8, 0, 0, 0, time.UTC))
	tillVoidedBy = "Ana"
)

func (c *tillCloses) ListClosedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.CashClose, error) {
	c.closedBetween = []time.Time{from, to}
	return c.ListRecent(ctx, establishmentID)
}

func (tillCloses) ListRecent(context.Context, string) ([]domain.CashClose, error) {
	return []domain.CashClose{{
		ID: "close-1", EstablishmentID: "e1", ClosedByID: "u1", ClosedByName: "Ana", ClosedAt: tillClosedAt,
		CashCloseTotals: domain.CashCloseTotals{ClosedOrders: 2, CashAmount: 2200},
		OpeningFloat:    15000, CountedCash: 17100,
	}}, nil
}
func (tillCloses) FindTill(context.Context, string) (domain.CashCloseTill, error) {
	return domain.CashCloseTill{}, nil
}
func (c *tillCloses) Close(_ context.Context, input domain.NewCashClose) (domain.CashClose, error) {
	c.closed = &input
	return domain.CashClose{
		ID: "close-2", EstablishmentID: input.EstablishmentID, ClosedByID: input.ClosedByID, ClosedByName: "Ana",
		Since: &tillClosedAt, ClosedAt: domain.NewTime(time.Date(2026, 9, 24, 23, 0, 0, 0, time.UTC)),
		CashCloseTotals: domain.CashCloseTotals{ClosedOrders: 1, CancelledOrders: 1, CancelledAmount: 1100, CashAmount: 1300, CardAmount: 1100, TipAmount: 200},
		OpeningFloat:    input.OpeningFloat, CountedCash: input.CountedCash, Notes: input.Notes,
	}, nil
}

func (c *tillCloses) Void(_ context.Context, input domain.VoidCashClose) (domain.CashClose, error) {
	c.voided = &input
	return domain.CashClose{
		ID: input.CashCloseID, EstablishmentID: input.EstablishmentID, ClosedByID: "user-1", ClosedByName: "Ana",
		ClosedAt: domain.NewTime(time.Date(2026, 9, 24, 23, 0, 0, 0, time.UTC)),
		VoidedAt: &tillVoidedAt, VoidedByID: &input.VoidedByID, VoidedByName: &tillVoidedBy,
	}, nil
}

type tillStats struct {
	since time.Time
}

func (s *tillStats) FindClosedOrders(_ context.Context, _ string, since time.Time) ([]domain.StatsOrder, error) {
	s.since = since
	return nil, nil
}

func newTillServer(access fakeAccess, closes *tillCloses, stats *tillStats) http.Handler {
	guard := testGuard(access)
	mux := http.NewServeMux()
	NewCashCloseHandler(service.NewCashCloseService(closes)).RegisterRoutes(mux, guard)
	NewStatsHandler(service.NewStatsService(stats)).RegisterRoutes(mux, guard)
	return mux
}

var tillSignedIn = map[string]string{"Authorization": "Bearer good"}

func TestCashCloseRoutesNeedTheOrdersModule(t *testing.T) {
	server := newTillServer(fakeAccess{role: domain.EstablishmentRoleOwner, modules: []domain.EstablishmentModule{domain.ModuleTimeTracking}}, &tillCloses{}, &tillStats{})

	for _, route := range []string{
		"GET /api/v1/establishments/e1/cash-closes",
		"GET /api/v1/establishments/e1/cash-closes?date=2026-09-23",
		"GET /api/v1/establishments/e1/cash-closes/preview",
		"POST /api/v1/establishments/e1/cash-closes",
		"POST /api/v1/establishments/e1/cash-closes/close-1/void",
	} {
		method, target, _ := strings.Cut(route, " ")

		if response := send(server, method, target, "", nil); response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}

		response := send(server, method, target, `{"openingFloat":0,"countedCash":0}`, tillSignedIn)
		want := `{"message":"MODULE_NOT_ENABLED","error":"Forbidden","statusCode":403}`
		if response.Code != http.StatusForbidden || response.Body.String() != want {
			t.Errorf("%s without orders = %d %s", route, response.Code, response.Body)
		}
	}

	if response := send(server, "GET", "/api/v1/establishments/e1/stats", "", tillSignedIn); response.Code != http.StatusOK {
		t.Errorf("stats without orders = %d %s, want 200: they have no module", response.Code, response.Body)
	}
}

func TestStaffCanCloseTheTill(t *testing.T) {
	server := newTillServer(fakeAccess{role: domain.EstablishmentRoleStaff, modules: domain.AllEstablishmentModules}, &tillCloses{}, &tillStats{})

	for _, tt := range []struct {
		route string
		want  int
	}{
		{route: "GET /api/v1/establishments/e1/cash-closes", want: http.StatusOK},
		{route: "GET /api/v1/establishments/e1/cash-closes/preview", want: http.StatusOK},
		{route: "POST /api/v1/establishments/e1/cash-closes", want: http.StatusCreated},
		{route: "POST /api/v1/establishments/e1/cash-closes/close-1/void", want: http.StatusCreated},
	} {
		method, target, _ := strings.Cut(tt.route, " ")

		if response := send(server, method, target, `{"openingFloat":0,"countedCash":0}`, tillSignedIn); response.Code != tt.want {
			t.Errorf("%s as staff = %d %s, want %d", tt.route, response.Code, response.Body, tt.want)
		}
	}

	response := send(server, "GET", "/api/v1/establishments/e1/stats", "", tillSignedIn)
	want := `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`
	if response.Code != http.StatusForbidden || response.Body.String() != want {
		t.Errorf("stats as staff = %d %s", response.Code, response.Body)
	}
}

func TestCashCloseRoutesAnswerLikeNest(t *testing.T) {
	closes := &tillCloses{}
	server := newTillServer(fakeAccess{role: domain.EstablishmentRoleManager, modules: domain.AllEstablishmentModules}, closes, &tillStats{})

	response := send(server, "GET", "/api/v1/establishments/e1/cash-closes", "", tillSignedIn)
	want := `[{"id":"close-1","establishmentId":"e1","closedById":"u1","closedByName":"Ana","since":null,"closedAt":"2026-09-23T23:40:00.000Z",` +
		`"closedOrders":2,"cancelledOrders":0,"cancelledAmount":0,"cashAmount":2200,"cardAmount":0,"tipAmount":0,` +
		`"openingFloat":15000,"countedCash":17100,"expectedCash":17200,"difference":-100,"notes":null,"voidedAt":null,"voidedById":null,"voidedByName":null}]`
	if response.Code != http.StatusOK || response.Body.String() != want {
		t.Errorf("list = %d %s\nwant %s", response.Code, response.Body, want)
	}

	response = send(server, "GET", "/api/v1/establishments/e1/cash-closes/preview", "", tillSignedIn)
	want = `{"closedOrders":0,"cancelledOrders":0,"cancelledAmount":0,"cashAmount":0,"cardAmount":0,"tipAmount":0,` +
		`"since":null,"openOrders":0,"openOrdersCharged":0,"openingFloat":0}`
	if response.Code != http.StatusOK || response.Body.String() != want {
		t.Errorf("preview = %d %s\nwant %s", response.Code, response.Body, want)
	}

	response = send(server, "POST", "/api/v1/establishments/e1/cash-closes", `{"openingFloat":15000,"countedCash":16400,"notes":"  Sin incidencias "}`, tillSignedIn)
	want = `{"id":"close-2","establishmentId":"e1","closedById":"u1","closedByName":"Ana","since":"2026-09-23T23:40:00.000Z","closedAt":"2026-09-24T23:00:00.000Z",` +
		`"closedOrders":1,"cancelledOrders":1,"cancelledAmount":1100,"cashAmount":1300,"cardAmount":1100,"tipAmount":200,` +
		`"openingFloat":15000,"countedCash":16400,"expectedCash":16300,"difference":100,"notes":"Sin incidencias","voidedAt":null,"voidedById":null,"voidedByName":null}`
	if response.Code != http.StatusCreated || response.Body.String() != want {
		t.Errorf("close = %d %s\nwant %s", response.Code, response.Body, want)
	}
	if closes.closed == nil || closes.closed.EstablishmentID != "e1" || closes.closed.ClosedByID != testUser.ID {
		t.Errorf("closed with %+v", closes.closed)
	}

	response = send(server, "POST", "/api/v1/establishments/e1/cash-closes/close-2/void", "", tillSignedIn)
	want = `{"id":"close-2","establishmentId":"e1","closedById":"user-1","closedByName":"Ana","since":null,"closedAt":"2026-09-24T23:00:00.000Z",` +
		`"closedOrders":0,"cancelledOrders":0,"cancelledAmount":0,"cashAmount":0,"cardAmount":0,"tipAmount":0,` +
		`"openingFloat":0,"countedCash":0,"expectedCash":0,"difference":0,"notes":null,` +
		`"voidedAt":"2026-09-25T08:00:00.000Z","voidedById":"` + testUser.ID + `","voidedByName":"Ana"}`
	if response.Code != http.StatusCreated || response.Body.String() != want {
		t.Errorf("void = %d %s\nwant %s", response.Code, response.Body, want)
	}
	if closes.voided == nil || *closes.voided != (domain.VoidCashClose{EstablishmentID: "e1", CashCloseID: "close-2", VoidedByID: testUser.ID}) {
		t.Errorf("voided with %+v", closes.voided)
	}
}

func TestCashCloseListOfADay(t *testing.T) {
	closes := &tillCloses{}
	server := newTillServer(fakeAccess{role: domain.EstablishmentRoleStaff, modules: domain.AllEstablishmentModules}, closes, &tillStats{})

	response := send(server, "GET", "/api/v1/establishments/e1/cash-closes?date=2026-09-23", "", tillSignedIn)
	if response.Code != http.StatusOK || !strings.HasPrefix(response.Body.String(), `[{"id":"close-1",`) {
		t.Errorf("list of a day = %d %s", response.Code, response.Body)
	}
	if want := time.Date(2026, 9, 22, 22, 0, 0, 0, time.UTC); len(closes.closedBetween) != 2 || !closes.closedBetween[0].Equal(want) {
		t.Errorf("read closes between %v, want from %s", closes.closedBetween, want)
	}

	response = send(server, "GET", "/api/v1/establishments/e1/cash-closes?date=23-09-2026", "", tillSignedIn)
	want := `{"message":"INVALID_DATE","error":"Bad Request","statusCode":400}`
	if response.Code != http.StatusBadRequest || response.Body.String() != want {
		t.Errorf("list of a bad date = %d %s", response.Code, response.Body)
	}
}

func TestCashCloseValidation(t *testing.T) {
	server := newTillServer(fakeAccess{role: domain.EstablishmentRoleManager, modules: domain.AllEstablishmentModules}, &tillCloses{}, &tillStats{})

	tests := []struct {
		name string
		body string
		want string
	}{
		{name: "a negative count", body: `{"openingFloat":0,"countedCash":-1}`, want: `["INVALID_TYPE"]`},
		{name: "a negative float", body: `{"openingFloat":-5,"countedCash":0}`, want: `["INVALID_TYPE"]`},
		{name: "cents with decimals", body: `{"openingFloat":10.5,"countedCash":0}`, want: `["INVALID_TYPE"]`},
		{name: "no count", body: `{"openingFloat":0}`, want: `["INVALID_TYPE"]`},
		{name: "notes that are not text", body: `{"openingFloat":0,"countedCash":0,"notes":5}`, want: `["INVALID_TYPE"]`},
		{name: "notes too long", body: `{"openingFloat":0,"countedCash":0,"notes":"` + strings.Repeat("a", 501) + `"}`, want: `["MAX_LENGTH"]`},
		{name: "an unknown property", body: `{"openingFloat":0,"countedCash":0,"total":5}`, want: `["property total should not exist"]`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := send(server, "POST", "/api/v1/establishments/e1/cash-closes", tt.body, tillSignedIn)
			want := `{"message":` + tt.want + `,"error":"Bad Request","statusCode":400}`
			if response.Code != http.StatusBadRequest || response.Body.String() != want {
				t.Errorf("%s = %d %s\nwant %s", tt.body, response.Code, response.Body, want)
			}
		})
	}

	for _, body := range []string{
		`{"openingFloat":0,"countedCash":0,"notes":null}`,
		`{"openingFloat":0,"countedCash":0,"notes":"` + strings.Repeat("ñ", 500) + `"}`,
	} {
		if response := send(server, "POST", "/api/v1/establishments/e1/cash-closes", body, tillSignedIn); response.Code != http.StatusCreated {
			t.Errorf("%.60s = %d %s, want 201", body, response.Code, response.Body)
		}
	}
}

func TestStatsHistoryFollowsThePermission(t *testing.T) {
	tests := []struct {
		role        domain.EstablishmentRole
		wantHistory bool
	}{
		{role: domain.EstablishmentRoleManager, wantHistory: false},
		{role: domain.EstablishmentRoleOwner, wantHistory: true},
	}

	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			stats := &tillStats{}
			server := newTillServer(fakeAccess{role: tt.role, modules: domain.AllEstablishmentModules}, &tillCloses{}, stats)

			response := send(server, "GET", "/api/v1/establishments/e1/stats", "", tillSignedIn)
			if response.Code != http.StatusOK {
				t.Fatalf("stats = %d %s", response.Code, response.Body)
			}

			body := response.Body.String()
			if !strings.HasPrefix(body, `{"todayRevenue":0,"yesterdayRevenue":0,"sameWeekdayLastWeekRevenue":0,"weeklyRevenue":0,"dailyRevenues":[{"dayName":"Lun","amount":0,"dateStr":"`) {
				t.Errorf("body = %s", body)
			}

			hasHistory := !strings.HasSuffix(body, `"todayTipAmount":0,"history":null}`)
			if hasHistory != tt.wantHistory || (tt.wantHistory && !strings.Contains(body, `"history":{"currentMonthRevenue":0,`)) {
				t.Errorf("history in %s, want %v", body, tt.wantHistory)
			}

			yearAgo := time.Now().AddDate(-1, 0, 0)
			if readTheYear := stats.since.Before(yearAgo); readTheYear != tt.wantHistory {
				t.Errorf("read orders since %s", stats.since)
			}
		})
	}
}
