package http

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

// tillAccess lets testUser into e1 with a role, and with the modules switched on.
type tillAccess struct {
	role    domain.EstablishmentRole
	modules []domain.EstablishmentModule
}

func (tillAccess) UserRole(context.Context, string) (domain.Role, error) { return domain.RoleUser, nil }
func (a tillAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	return &domain.Membership{Role: string(a.role), Active: true}, nil
}
func (a tillAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return a.modules, nil
}
func (tillAccess) SubscriptionActive(context.Context, string) (bool, error) { return true, nil }

// tillCloses answers with one close of the past and nothing to count, and keeps the close it
// was asked for.
type tillCloses struct {
	closed *domain.NewCashClose
}

var tillClosedAt = domain.NewTime(time.Date(2026, 9, 23, 23, 40, 0, 0, time.UTC))

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

// tillStats has no orders and keeps where it was asked to read from.
type tillStats struct {
	since time.Time
}

func (s *tillStats) FindClosedOrders(_ context.Context, _ string, since time.Time) ([]domain.StatsOrder, error) {
	s.since = since
	return nil, nil
}

func newTillServer(access tillAccess, closes *tillCloses, stats *tillStats) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewCashCloseHandler(service.NewCashCloseService(closes)).RegisterRoutes(mux, guard)
	NewStatsHandler(service.NewStatsService(stats)).RegisterRoutes(mux, guard)
	return mux
}

var tillSignedIn = map[string]string{"Authorization": "Bearer good"}

func TestCashCloseRoutesNeedTheOrdersModule(t *testing.T) {
	server := newTillServer(tillAccess{role: domain.EstablishmentRoleOwner, modules: []domain.EstablishmentModule{domain.ModuleTimeTracking}}, &tillCloses{}, &tillStats{})

	for _, route := range []string{
		"GET /api/v1/establishments/e1/cash-closes",
		"GET /api/v1/establishments/e1/cash-closes/preview",
		"POST /api/v1/establishments/e1/cash-closes",
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

func TestCashCloseRoutesKeepStaffOut(t *testing.T) {
	server := newTillServer(tillAccess{role: domain.EstablishmentRoleStaff, modules: domain.AllEstablishmentModules}, &tillCloses{}, &tillStats{})

	for _, route := range []string{
		"GET /api/v1/establishments/e1/cash-closes",
		"GET /api/v1/establishments/e1/cash-closes/preview",
		"POST /api/v1/establishments/e1/cash-closes",
		"GET /api/v1/establishments/e1/stats",
	} {
		method, target, _ := strings.Cut(route, " ")

		response := send(server, method, target, `{"openingFloat":0,"countedCash":0}`, tillSignedIn)
		want := `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`
		if response.Code != http.StatusForbidden || response.Body.String() != want {
			t.Errorf("%s as staff = %d %s", route, response.Code, response.Body)
		}
	}
}

func TestCashCloseRoutesAnswerLikeNest(t *testing.T) {
	closes := &tillCloses{}
	server := newTillServer(tillAccess{role: domain.EstablishmentRoleManager, modules: domain.AllEstablishmentModules}, closes, &tillStats{})

	response := send(server, "GET", "/api/v1/establishments/e1/cash-closes", "", tillSignedIn)
	want := `[{"id":"close-1","establishmentId":"e1","closedById":"u1","closedByName":"Ana","since":null,"closedAt":"2026-09-23T23:40:00.000Z",` +
		`"closedOrders":2,"cancelledOrders":0,"cancelledAmount":0,"cashAmount":2200,"cardAmount":0,"tipAmount":0,` +
		`"openingFloat":15000,"countedCash":17100,"expectedCash":17200,"difference":-100,"notes":null}]`
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
		`"openingFloat":15000,"countedCash":16400,"expectedCash":16300,"difference":100,"notes":"Sin incidencias"}`
	if response.Code != http.StatusCreated || response.Body.String() != want {
		t.Errorf("close = %d %s\nwant %s", response.Code, response.Body, want)
	}
	if closes.closed == nil || closes.closed.EstablishmentID != "e1" || closes.closed.ClosedByID != testUser.ID {
		t.Errorf("closed with %+v", closes.closed)
	}
}

func TestCashCloseValidation(t *testing.T) {
	server := newTillServer(tillAccess{role: domain.EstablishmentRoleManager, modules: domain.AllEstablishmentModules}, &tillCloses{}, &tillStats{})

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
			server := newTillServer(tillAccess{role: tt.role, modules: domain.AllEstablishmentModules}, &tillCloses{}, stats)

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
