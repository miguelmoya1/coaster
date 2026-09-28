package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/service"
)

type printerAccess struct {
	fakeAccess
	role    domain.EstablishmentRole
	modules []domain.EstablishmentModule
}

func (a printerAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	return &domain.Membership{Role: string(a.role), Active: true}, nil
}

func (a printerAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return a.modules, nil
}

type printerConfigsStub struct {
	ipAddress *string
}

func (s printerConfigsStub) Find(_ context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	if establishmentID != "e1" {
		return nil, nil
	}
	return &domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "the-key", IPAddress: s.ipAddress, Port: 9090}, nil
}

func (printerConfigsStub) Create(_ context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	return &domain.PrinterConfig{EstablishmentID: establishmentID, DeviceKey: "new-key", Port: 8080}, nil
}

func (printerConfigsStub) RegisterAddress(context.Context, string, string, *int, time.Time) error {
	return nil
}

func (printerConfigsStub) RotateDeviceKey(context.Context, string, string) error { return nil }

func (printerConfigsStub) TouchLastSeen(context.Context, string, time.Time) error { return nil }

type printerPairingsStub struct{}

func (printerPairingsStub) Issue(context.Context, string, string, time.Time) error { return nil }

func (printerPairingsStub) Redeem(_ context.Context, code string, _ time.Time) (string, error) {
	if code == "7F3KB92X" {
		return "e2", nil
	}
	return "", nil
}

type printerJobsStub struct {
	waiting *domain.ClaimedPrintJob
}

func (printerJobsStub) Enqueue(context.Context, string, domain.PrintTicket) (string, error) {
	return "job-new", nil
}

func (printerJobsStub) FindByID(_ context.Context, id string) (*domain.PrintJob, error) {
	if id != "job-1" {
		return nil, nil
	}
	return &domain.PrintJob{
		ID: "job-1", EstablishmentID: "e1", Status: domain.PrintJobPending,
		CreatedAt: domain.NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)),
	}, nil
}

func (s printerJobsStub) ClaimNext(context.Context, string, time.Time) (*domain.ClaimedPrintJob, error) {
	return s.waiting, nil
}

func (printerJobsStub) Complete(context.Context, string, time.Time) error { return nil }

func (printerJobsStub) Fail(context.Context, string, string, time.Time) error { return nil }

func (printerJobsStub) RequeueStale(context.Context, string, time.Time, time.Time) error { return nil }

type printerServerOptions struct {
	role      domain.EstablishmentRole
	modules   []domain.EstablishmentModule
	ipAddress *string
	waiting   *domain.ClaimedPrintJob
}

func newPrinterServer(options printerServerOptions) http.Handler {
	printers := service.NewPrinterService(
		printerConfigsStub{ipAddress: options.ipAddress}, printerPairingsStub{}, printerJobsStub{waiting: options.waiting}, "secret",
	)
	printers.StopWaiting()

	downloads := fstest.MapFS{"printer-service-linux": {Data: []byte("the linux bridge")}}
	releases := service.NewPrinterReleaseService(downloads, "https://api.example.com")

	access := printerAccess{role: options.role, modules: options.modules}
	guard := middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewPrinterHandler(printers, releases).RegisterRoutes(mux, guard)
	NewPrinterConnectionHandler(printers).RegisterRoutes(mux, guard)
	return mux
}

func TestPrinterConnectionRoutesAreGuarded(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	orders := []domain.EstablishmentModule{domain.ModuleOrders}

	view := []string{
		"POST /api/v1/establishments/e1/printer/jobs",
		"GET /api/v1/establishments/e1/printer/jobs/job-1",
		"GET /api/v1/establishments/e1/printer/connection",
		"GET /api/v1/establishments/e1/printer/status",
	}
	manage := []string{
		"POST /api/v1/establishments/e1/printer/pairing",
		"POST /api/v1/establishments/e1/printer/device-key",
	}

	for _, route := range append(view, manage...) {
		method, target, _ := strings.Cut(route, " ")

		response := send(newPrinterServer(printerServerOptions{role: domain.EstablishmentRoleOwner, modules: orders}), method, target, "", nil)
		if response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}

		response = send(newPrinterServer(printerServerOptions{role: domain.EstablishmentRoleOwner}), method, target, "", signedIn)
		if want := `{"message":"MODULE_NOT_ENABLED","error":"Forbidden","statusCode":403}`; response.Body.String() != want {
			t.Errorf("%s without the orders module = %d %s", route, response.Code, response.Body)
		}
	}

	for _, route := range manage {
		method, target, _ := strings.Cut(route, " ")

		response := send(newPrinterServer(printerServerOptions{role: domain.EstablishmentRoleStaff, modules: orders}), method, target, "", signedIn)
		if want := `{"message":"UNAUTHORIZED","error":"Forbidden","statusCode":403}`; response.Body.String() != want {
			t.Errorf("%s as staff = %d %s", route, response.Code, response.Body)
		}
	}
}

func TestPrinterConnectionRoutes(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	ip := "192.168.1.100"
	server := newPrinterServer(printerServerOptions{role: domain.EstablishmentRoleStaff, modules: []domain.EstablishmentModule{domain.ModuleOrders}, ipAddress: &ip})
	manager := newPrinterServer(printerServerOptions{role: domain.EstablishmentRoleManager, modules: []domain.EstablishmentModule{domain.ModuleOrders}})

	tests := []struct {
		name   string
		server http.Handler
		route  string
		body   string
		status int
		want   string
	}{
		{name: "queue a ticket", server: server, route: "POST /api/v1/establishments/e1/printer/jobs",
			body:   `{"type":"order","table":"Mesa 4","items":[{"name":"Caña","quantity":2,"price":"2.50","total":"5.00"}],"total":"5.00"}`,
			status: 201, want: `{"jobId":"job-new"}`},
		{name: "queue without a bridge", server: server, route: "POST /api/v1/establishments/e2/printer/jobs", body: `{"type":"raw","rawText":"hola"}`,
			status: 404, want: `{"message":"PRINTER_NOT_CONFIGURED","error":"Not Found","statusCode":404}`},
		{name: "a ticket of an unknown type", server: server, route: "POST /api/v1/establishments/e1/printer/jobs", body: `{"type":"fax"}`,
			status: 400, want: `{"message":["type must be one of the following values: order, raw"],"error":"Bad Request","statusCode":400}`},
		{name: "a line without units", server: server, route: "POST /api/v1/establishments/e1/printer/jobs",
			body:   `{"type":"order","items":[{"name":"Caña","quantity":0,"price":"2.50","total":"0.00"}]}`,
			status: 400, want: `{"message":["items.0.quantity must not be less than 1"],"error":"Bad Request","statusCode":400}`},
		{name: "too many lines", server: server, route: "POST /api/v1/establishments/e1/printer/jobs",
			body:   `{"type":"order","items":[` + strings.Repeat(`{"name":"a","quantity":1,"price":"1","total":"1"},`, 200) + `{"name":"a","quantity":1,"price":"1","total":"1"}]}`,
			status: 400, want: `{"message":["items must contain no more than 200 elements"],"error":"Bad Request","statusCode":400}`},
		{name: "a note too long", server: server, route: "POST /api/v1/establishments/e1/printer/jobs",
			body:   `{"type":"raw","notes":"` + strings.Repeat("a", 501) + `","extra":1}`,
			status: 400, want: `{"message":["property extra should not exist","notes must be shorter than or equal to 500 characters"],"error":"Bad Request","statusCode":400}`},
		{name: "a job", server: server, route: "GET /api/v1/establishments/e1/printer/jobs/job-1",
			status: 200, want: `{"id":"job-1","status":"PENDING","error":null,"createdAt":"2026-09-27T10:00:00.000Z","completedAt":null}`},
		{name: "a job of another establishment", server: server, route: "GET /api/v1/establishments/e2/printer/jobs/job-1",
			status: 404, want: `{"message":"PRINT_JOB_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "status without a bridge", server: server, route: "GET /api/v1/establishments/e2/printer/status",
			status: 200, want: `{"establishmentId":"e2","isOnline":false,"ipAddress":null,"port":8080,"lastSeenAt":null}`},
		{name: "connection without an address", server: manager, route: "GET /api/v1/establishments/e1/printer/connection",
			status: 404, want: `{"message":"PRINTER_NOT_CONNECTED","error":"Not Found","statusCode":404}`},
		{name: "a new device key", server: manager, route: "POST /api/v1/establishments/e2/printer/device-key",
			status: 201, want: `{"deviceKey":"new-key"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(tt.server, method, target, tt.body, signedIn)
			if response.Code != tt.status || response.Body.String() != tt.want {
				t.Errorf("%s = %d %s\nwant %d %s", tt.route, response.Code, response.Body, tt.status, tt.want)
			}
		})
	}

	response := send(server, "GET", "/api/v1/establishments/e1/printer/connection", "", signedIn)
	var connection domain.PrinterConnection
	if err := json.Unmarshal(response.Body.Bytes(), &connection); err != nil || response.Code != 200 ||
		connection.IPAddress != ip || connection.Port != 9090 || strings.Count(connection.Token, ".") != 2 {
		t.Errorf("connection = %d %s", response.Code, response.Body)
	}

	response = send(manager, "POST", "/api/v1/establishments/e1/printer/pairing", "", signedIn)
	var pairing domain.PrinterPairingCode
	if err := json.Unmarshal(response.Body.Bytes(), &pairing); err != nil || response.Code != 201 || len(pairing.Code) != 8 {
		t.Errorf("pairing = %d %s", response.Code, response.Body)
	}
}

func TestPrinterBridgeRoutes(t *testing.T) {
	waiting := &domain.ClaimedPrintJob{ID: "job-1", Payload: json.RawMessage(`{"type": "order", "total": "9.00"}`)}
	server := newPrinterServer(printerServerOptions{})
	busy := newPrinterServer(printerServerOptions{waiting: waiting})
	key := map[string]string{"X-Device-Key": "the-key"}
	wrongKey := map[string]string{"X-Device-Key": "not-the-key"}

	tests := []struct {
		name    string
		server  http.Handler
		route   string
		body    string
		headers map[string]string
		status  int
		want    string
	}{
		{name: "latest release", server: server, route: "GET /api/v1/printer/check-version?os=linux", status: 200,
			want: `{"version":"1.2.0","url":"https://api.example.com/public/downloads/printer-service-linux","sha256":"d67472a67f43ec39badd5f107eebbdb41b3fd99453e952517700a841a87c88d9"}`},
		{name: "an OS without a binary", server: server, route: "GET /api/v1/printer/check-version?os=windows", status: 404,
			want: `{"message":"No bridge binary is published for this OS yet","error":"Not Found","statusCode":404}`},
		{name: "an OS that is not supported", server: server, route: "GET /api/v1/printer/check-version?os=mac", status: 400,
			want: `{"message":"Unsupported OS. Use \"windows\" or \"linux\".","error":"Bad Request","statusCode":400}`},
		{name: "download with a bad code", server: server, route: "GET /api/v1/printer/download?os=linux&code=hello", status: 400,
			want: `{"message":"INVALID_TYPE","error":"Bad Request","statusCode":400}`},
		{name: "download without a binary", server: server, route: "GET /api/v1/printer/download?os=windows&code=7F3KB92X", status: 404,
			want: `{"message":"PRINTER_NOT_CONFIGURED","error":"Not Found","statusCode":404}`},
		{name: "pair", server: server, route: "POST /api/v1/printer/pair", body: `{"code":" 7f3kb92x "}`, status: 201,
			want: `{"establishmentId":"e2","deviceKey":"new-key"}`},
		{name: "pair with a code nobody issued", server: server, route: "POST /api/v1/printer/pair", body: `{"code":"ZZZZZZZZ"}`, status: 404,
			want: `{"message":"PRINTER_PAIRING_INVALID","error":"Not Found","statusCode":404}`},
		{name: "pair with a short code", server: server, route: "POST /api/v1/printer/pair", body: `{"code":"ZZZ"}`, status: 404,
			want: `{"message":"PRINTER_PAIRING_INVALID","error":"Not Found","statusCode":404}`},
		{name: "heartbeat", server: server, route: "POST /api/v1/printer/register-ip", headers: key,
			body: `{"establishmentId":"e1","ipAddress":"192.168.1.100","port":9090}`, status: 201, want: `{"success":true}`},
		{name: "heartbeat without a key", server: server, route: "POST /api/v1/printer/register-ip",
			body: `{"establishmentId":"e1","ipAddress":"192.168.1.100"}`, status: 401,
			want: `{"message":"X-Device-Key header is required","error":"Unauthorized","statusCode":401}`},
		{name: "heartbeat with a wrong key", server: server, route: "POST /api/v1/printer/register-ip", headers: wrongKey,
			body: `{"establishmentId":"e1","ipAddress":"192.168.1.100"}`, status: 403,
			want: `{"message":"PRINTER_INVALID_DEVICE_KEY","error":"Forbidden","statusCode":403}`},
		{name: "heartbeat from an establishment without a bridge", server: server, route: "POST /api/v1/printer/register-ip", headers: key,
			body: `{"establishmentId":"e2","ipAddress":"192.168.1.100"}`, status: 404,
			want: `{"message":"PRINTER_NOT_CONFIGURED","error":"Not Found","statusCode":404}`},
		{name: "heartbeat with a bad address", server: server, route: "POST /api/v1/printer/register-ip", headers: key,
			body: `{"establishmentId":"e1","ipAddress":"printer.local","port":70000}`, status: 400,
			want: `{"message":["ipAddress must be an ip address","port must not be greater than 65535"],"error":"Bad Request","statusCode":400}`},
		{name: "next job", server: busy, route: "GET /api/v1/printer/jobs/next?establishmentId=e1", headers: key, status: 200,
			want: `{"id":"job-1","payload":{"type":"order","total":"9.00"}}`},
		{name: "nothing to print", server: server, route: "GET /api/v1/printer/jobs/next?establishmentId=e1", headers: key, status: 204},
		{name: "next job without an establishment", server: server, route: "GET /api/v1/printer/jobs/next", headers: key, status: 400,
			want: `{"message":"establishmentId is required","error":"Bad Request","statusCode":400}`},
		{name: "next job with a wrong key", server: server, route: "GET /api/v1/printer/jobs/next?establishmentId=e1", headers: wrongKey, status: 403,
			want: `{"message":"PRINTER_INVALID_DEVICE_KEY","error":"Forbidden","statusCode":403}`},
		{name: "result", server: server, route: "POST /api/v1/printer/jobs/job-1/result?establishmentId=e1", headers: key,
			body: `{"status":"failed","error":"out of paper"}`, status: 204},
		{name: "result of an unknown job", server: server, route: "POST /api/v1/printer/jobs/nope/result?establishmentId=e1", headers: key,
			body: `{"status":"printed"}`, status: 404, want: `{"message":"PRINT_JOB_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{name: "result without an establishment", server: server, route: "POST /api/v1/printer/jobs/job-1/result", headers: key,
			body: `{"status":"printed"}`, status: 400, want: `{"message":"establishmentId is required","error":"Bad Request","statusCode":400}`},
		{name: "a result that is neither", server: server, route: "POST /api/v1/printer/jobs/job-1/result", headers: key,
			body: `{"status":"lost"}`, status: 400,
			want: `{"message":["status must be one of the following values: printed, failed"],"error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(tt.server, method, target, tt.body, tt.headers)
			if response.Code != tt.status || response.Body.String() != tt.want {
				t.Errorf("%s = %d %s\nwant %d %s", tt.route, response.Code, response.Body, tt.status, tt.want)
			}
		})
	}
}

func TestPrinterDownload(t *testing.T) {
	response := send(newPrinterServer(printerServerOptions{}), "GET", "/api/v1/printer/download?os=linux&code=7f3kb92x", "", nil)

	if response.Code != http.StatusOK || response.Body.String() != "the linux bridge" {
		t.Fatalf("download = %d %q", response.Code, response.Body)
	}
	if got := response.Header().Get("Content-Type"); got != "application/octet-stream" {
		t.Errorf("Content-Type = %q", got)
	}
	if got := response.Header().Get("Content-Disposition"); got != `attachment; filename="coaster-printer-7F3KB92X"` {
		t.Errorf("Content-Disposition = %q", got)
	}
}

func TestPrinterRateLimits(t *testing.T) {
	server := newPrinterServer(printerServerOptions{})
	key := map[string]string{"X-Device-Key": "the-key"}

	for i := range 10 {
		if response := send(server, "POST", "/api/v1/printer/pair", `{"code":"ZZZZZZZZ"}`, nil); response.Code != http.StatusNotFound {
			t.Fatalf("pairing attempt %d = %d", i+1, response.Code)
		}
	}
	if response := send(server, "POST", "/api/v1/printer/pair", `{"code":"ZZZZZZZZ"}`, nil); response.Code != http.StatusTooManyRequests {
		t.Errorf("the 11th pairing attempt in a minute = %d, want 429", response.Code)
	}

	for i := range 400 {
		response := send(server, "GET", "/api/v1/printer/jobs/next?establishmentId=e1", "", key)
		if response.Code != http.StatusNoContent || response.Header().Get("X-RateLimit-Limit") != "" {
			t.Fatalf("poll %d = %d with limit %q; the long poll has no rate limit", i+1, response.Code, response.Header().Get("X-RateLimit-Limit"))
		}
	}
}
