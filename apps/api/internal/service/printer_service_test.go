package service

import (
	"context"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"coaster-api/internal/core/domain"
)

const printerTestSecret = "the-secret-the-bridge-also-has"

var printerTestNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

func newTestPrinterService(configs *fakePrinterConfigRepo, jobs *fakePrintJobRepo) *PrinterService {
	s := NewPrinterService(configs, newFakePrinterPairingRepo(), jobs, printerTestSecret)
	s.now = func() time.Time { return printerTestNow }
	s.holdOpenFor = 100 * time.Millisecond
	s.checkEvery = 5 * time.Millisecond
	return s
}

func isPrinterError(err error, kind domain.ErrorKind, code string) bool {
	var domainErr *domain.Error
	return errors.As(err, &domainErr) && domainErr.Kind == kind && domainErr.Code == code
}

func TestPrinterServiceGenerateDeviceKey(t *testing.T) {
	configs := newFakePrinterConfigRepo()
	printers := newTestPrinterService(configs, newFakePrintJobRepo())
	ctx := context.Background()

	issued, err := printers.GenerateDeviceKey(ctx, "e1")
	if err != nil || issued.DeviceKey != "generated-key-1" || configs.get("e1") == nil {
		t.Fatalf("first key = %+v, %v; want the key of a new bridge", issued, err)
	}

	first, _ := printers.GenerateDeviceKey(ctx, "e1")
	second, _ := printers.GenerateDeviceKey(ctx, "e1")
	if len(first.DeviceKey) != 36 || first.DeviceKey == issued.DeviceKey || first.DeviceKey == second.DeviceKey {
		t.Fatalf("rotations = %q, %q; want a new UUID each time", first.DeviceKey, second.DeviceKey)
	}
	if stored := configs.get("e1"); stored.DeviceKey != second.DeviceKey || configs.created != 1 {
		t.Errorf("stored = %+v after %d creations, want the last key on the same bridge", stored, configs.created)
	}
}

func TestPrinterServicePairing(t *testing.T) {
	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e2", DeviceKey: "existing-key"})
	pairings := newFakePrinterPairingRepo()
	printers := NewPrinterService(configs, pairings, newFakePrintJobRepo(), printerTestSecret)
	printers.now = func() time.Time { return printerTestNow }
	ctx := context.Background()

	issued, err := printers.IssuePairing(ctx, "e1")
	if err != nil || len(issued.Code) != domain.PairingCodeLength {
		t.Fatalf("IssuePairing = %+v, %v", issued, err)
	}
	if pairing := pairings.pairings[issued.Code]; pairing.establishmentID != "e1" || !pairing.expiresAt.Equal(printerTestNow.Add(time.Hour)) {
		t.Errorf("stored pairing = %+v, want e1 for an hour", pairing)
	}

	redeemed, err := printers.RedeemPairing(ctx, "  "+strings.ToLower(issued.Code)+" ")
	if err != nil || redeemed.EstablishmentID != "e1" || redeemed.DeviceKey != "generated-key-1" {
		t.Fatalf("RedeemPairing = %+v, %v; want a new bridge for e1", redeemed, err)
	}

	if _, err := printers.RedeemPairing(ctx, issued.Code); !isPrinterError(err, domain.KindNotFound, domain.CodePrinterPairingInvalid) {
		t.Errorf("a spent code = %v, want 404 %s", err, domain.CodePrinterPairingInvalid)
	}

	for _, code := range []string{"ZZZ", "ZZZZZZZZZ", "        "} {
		if _, err := printers.RedeemPairing(ctx, code); !isPrinterError(err, domain.KindNotFound, domain.CodePrinterPairingInvalid) {
			t.Errorf("RedeemPairing(%q) = %v, want 404 %s", code, err, domain.CodePrinterPairingInvalid)
		}
	}

	other, _ := printers.IssuePairing(ctx, "e2")
	redeemed, err = printers.RedeemPairing(ctx, other.Code)
	if err != nil || redeemed.DeviceKey != "existing-key" || configs.created != 1 {
		t.Errorf("RedeemPairing with a bridge = %+v, %v; want the key it already has", redeemed, err)
	}
}

func TestPrinterServiceAuthenticatesTheBridge(t *testing.T) {
	tests := []struct {
		name      string
		deviceKey string
		configs   []domain.PrinterConfig
		kind      domain.ErrorKind
		code      string
	}{
		{name: "no key", deviceKey: "", kind: domain.KindUnauthorized, code: domain.MessageDeviceKeyRequired},
		{name: "no bridge", deviceKey: "key-123", kind: domain.KindNotFound, code: domain.CodePrinterNotConfigured},
		{name: "wrong key", deviceKey: "wrong-key", configs: []domain.PrinterConfig{{EstablishmentID: "e1", DeviceKey: "correct-key"}},
			kind: domain.KindForbidden, code: domain.CodePrinterInvalidDeviceKey},
		{name: "a prefix of the key", deviceKey: "correct-key", configs: []domain.PrinterConfig{{EstablishmentID: "e1", DeviceKey: "correct-key-abc"}},
			kind: domain.KindForbidden, code: domain.CodePrinterInvalidDeviceKey},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configs := newFakePrinterConfigRepo(tt.configs...)
			jobs := newFakePrintJobRepo()
			jobs.add("job-1", "e1", domain.PrintJobPrinting, domain.PrintTicket{Type: "raw"})
			printers := newTestPrinterService(configs, jobs)
			ctx := context.Background()

			calls := map[string]error{
				"RegisterAddress": printers.RegisterAddress(ctx, "e1", tt.deviceKey, "192.168.1.100", nil),
				"ReportResult":    printers.ReportResult(ctx, "e1", "job-1", tt.deviceKey, domain.PrintJobResult{Printed: true}),
			}
			_, calls["NextJob"] = printers.NextJob(ctx, "e1", tt.deviceKey)

			for name, err := range calls {
				if !isPrinterError(err, tt.kind, tt.code) {
					t.Errorf("%s = %v, want %s", name, err, tt.code)
				}
			}
			if config := configs.get("e1"); config != nil && (config.IPAddress != nil || config.LastSeenAt != nil) {
				t.Errorf("the bridge should be left alone: %+v", config)
			}
			if jobs.get("job-1").Status != domain.PrintJobPrinting || jobs.claimCount() != 0 {
				t.Error("no job should change")
			}
		})
	}
}

func TestPrinterServiceRegisterAddress(t *testing.T) {
	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "correct-key-abc", Port: 8080})
	printers := newTestPrinterService(configs, newFakePrintJobRepo())

	if err := printers.RegisterAddress(context.Background(), "e1", "correct-key-abc", "192.168.1.100", nil); err != nil {
		t.Fatal(err)
	}
	config := configs.get("e1")
	if *config.IPAddress != "192.168.1.100" || config.Port != 8080 || !config.LastSeenAt.Equal(printerTestNow) {
		t.Fatalf("after a heartbeat without a port = %+v", config)
	}

	port := 9090
	if err := printers.RegisterAddress(context.Background(), "e1", "correct-key-abc", "192.168.1.100", &port); err != nil {
		t.Fatal(err)
	}
	if config := configs.get("e1"); config.Port != 9090 {
		t.Errorf("port = %d, want the one the bridge reported", config.Port)
	}
}

func TestPrinterServiceStatus(t *testing.T) {
	ip := "192.168.1.100"
	recently := printerTestNow.Add(-time.Minute)
	longAgo := printerTestNow.Add(-domain.PrinterOnlineWindow)

	tests := []struct {
		name   string
		config *domain.PrinterConfig
		want   string
	}{
		{name: "no bridge",
			want: `{"establishmentId":"e1","isOnline":false,"ipAddress":null,"port":8080,"lastSeenAt":null}`},
		{name: "never seen", config: &domain.PrinterConfig{EstablishmentID: "e1", Port: 9090},
			want: `{"establishmentId":"e1","isOnline":false,"ipAddress":null,"port":9090,"lastSeenAt":null}`},
		{name: "seen a minute ago", config: &domain.PrinterConfig{EstablishmentID: "e1", IPAddress: &ip, Port: 8080, LastSeenAt: &recently},
			want: `{"establishmentId":"e1","isOnline":true,"ipAddress":"192.168.1.100","port":8080,"lastSeenAt":"2026-09-27T09:59:00.000Z"}`},
		{name: "seen two minutes ago", config: &domain.PrinterConfig{EstablishmentID: "e1", IPAddress: &ip, Port: 8080, LastSeenAt: &longAgo},
			want: `{"establishmentId":"e1","isOnline":false,"ipAddress":"192.168.1.100","port":8080,"lastSeenAt":"2026-09-27T09:58:00.000Z"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configs := newFakePrinterConfigRepo()
			if tt.config != nil {
				configs = newFakePrinterConfigRepo(*tt.config)
			}

			status, err := newTestPrinterService(configs, newFakePrintJobRepo()).Status(context.Background(), "e1")
			if err != nil {
				t.Fatal(err)
			}
			if got, _ := json.Marshal(status); string(got) != tt.want {
				t.Errorf("status = %s\nwant     %s", got, tt.want)
			}
		})
	}
}

func TestPrinterServiceConnection(t *testing.T) {
	ip := "192.168.1.100"
	empty := ""

	for _, config := range []*domain.PrinterConfig{nil, {EstablishmentID: "e1"}, {EstablishmentID: "e1", IPAddress: &empty}} {
		configs := newFakePrinterConfigRepo()
		if config != nil {
			configs = newFakePrinterConfigRepo(*config)
		}
		_, err := newTestPrinterService(configs, newFakePrintJobRepo()).Connection(context.Background(), "e1")
		if !isPrinterError(err, domain.KindNotFound, domain.CodePrinterNotConnected) {
			t.Errorf("Connection of %+v = %v, want 404 %s", config, err, domain.CodePrinterNotConnected)
		}
	}

	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", IPAddress: &ip, Port: 9090})
	connection, err := newTestPrinterService(configs, newFakePrintJobRepo()).Connection(context.Background(), "e1")
	if err != nil || connection.IPAddress != ip || connection.Port != 9090 || connection.Token == "" {
		t.Fatalf("Connection = %+v, %v", connection, err)
	}
}

type bridgeJWTPayload struct {
	EstablishmentID string `json:"establishmentId"`
	jwt.RegisteredClaims
}

func validateLikeTheBridge(tokenStr string, secret []byte, establishmentID string) (*bridgeJWTPayload, error) {
	payload := &bridgeJWTPayload{}

	_, err := jwt.ParseWithClaims(
		tokenStr,
		payload,
		func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}

	if establishmentID != "" && subtle.ConstantTimeCompare([]byte(payload.EstablishmentID), []byte(establishmentID)) != 1 {
		return nil, errors.New("token was issued for a different establishment")
	}

	return payload, nil
}

func TestPrinterTokenIsWhatTheBridgeAccepts(t *testing.T) {
	printers := NewPrinterService(newFakePrinterConfigRepo(), newFakePrinterPairingRepo(), newFakePrintJobRepo(), printerTestSecret)

	token, err := printers.signToken("e1")
	if err != nil {
		t.Fatal(err)
	}

	payload, err := validateLikeTheBridge(token, []byte(printerTestSecret), "e1")
	if err != nil {
		t.Fatalf("the bridge refused the token: %v", err)
	}
	if payload.EstablishmentID != "e1" {
		t.Errorf("establishmentId = %q", payload.EstablishmentID)
	}
	if lifetime := payload.ExpiresAt.Sub(payload.IssuedAt.Time); lifetime != 8*24*time.Hour {
		t.Errorf("exp - iat = %s, want 8 days", lifetime)
	}

	header, _ := base64.RawURLEncoding.DecodeString(strings.Split(token, ".")[0])
	if string(header) != `{"alg":"HS256","typ":"JWT"}` {
		t.Errorf("header = %s", header)
	}

	if _, err := validateLikeTheBridge(token, []byte("another-secret"), "e1"); err == nil {
		t.Error("a bridge with another secret should refuse the token")
	}
	if _, err := validateLikeTheBridge(token, []byte(printerTestSecret), "e2"); err == nil {
		t.Error("the bridge of another establishment should refuse the token")
	}

	printers.now = func() time.Time { return time.Now().Add(-9 * 24 * time.Hour) }
	expired, _ := printers.signToken("e1")
	if _, err := validateLikeTheBridge(expired, []byte(printerTestSecret), "e1"); err == nil {
		t.Error("the bridge should refuse a token older than 8 days")
	}
}

func TestPrinterServiceQueue(t *testing.T) {
	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "key"})
	jobs := newFakePrintJobRepo()
	jobs.add("other", "e2", domain.PrintJobPending, domain.PrintTicket{Type: "raw"})
	printers := newTestPrinterService(configs, jobs)
	ctx := context.Background()

	total := "9.00"
	if _, err := printers.Enqueue(ctx, "e3", domain.PrintTicket{Type: "order"}); !isPrinterError(err, domain.KindNotFound, domain.CodePrinterNotConfigured) {
		t.Errorf("Enqueue without a bridge = %v, want 404 %s", err, domain.CodePrinterNotConfigured)
	}
	queued, err := printers.Enqueue(ctx, "e1", domain.PrintTicket{Type: "order", Total: &total})
	if err != nil || queued.JobID != "job-2" {
		t.Fatalf("Enqueue = %+v, %v", queued, err)
	}

	job, err := printers.Job(ctx, "e1", queued.JobID)
	if err != nil || job.Status != domain.PrintJobPending {
		t.Fatalf("Job = %+v, %v", job, err)
	}
	if len(jobs.requeuedFrom) != 1 || !jobs.requeuedFrom[0].Equal(printerTestNow.Add(-domain.PrintJobStaleAfter)) {
		t.Errorf("requeued = %v; reading a job should put the stale ones back in the queue first", jobs.requeuedFrom)
	}
	for _, jobID := range []string{"other", "nope"} {
		if _, err := printers.Job(ctx, "e1", jobID); !isPrinterError(err, domain.KindNotFound, domain.CodePrintJobNotFound) {
			t.Errorf("Job(%s) = %v, want 404 %s", jobID, err, domain.CodePrintJobNotFound)
		}
	}
}

func TestPrinterServiceNextJobHandsOutAWaitingJob(t *testing.T) {
	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "key"})
	jobs := newFakePrintJobRepo()
	total := "9.00"
	jobs.add("job-1", "e1", domain.PrintJobPending, domain.PrintTicket{Type: "order", Total: &total})
	printers := newTestPrinterService(configs, jobs)

	job, err := printers.NextJob(context.Background(), "e1", "key")
	if err != nil || job == nil || job.ID != "job-1" || string(job.Payload) != `{"type":"order","total":"9.00"}` {
		t.Fatalf("NextJob = %+v, %v", job, err)
	}
	if jobs.claimCount() != 1 {
		t.Errorf("claims = %d, want the job straight away", jobs.claimCount())
	}
	if seen := configs.get("e1").LastSeenAt; seen == nil || !seen.Equal(printerTestNow) {
		t.Errorf("lastSeenAt = %v, want the bridge recorded as alive", seen)
	}
	if len(jobs.requeuedFrom) != 1 || !jobs.requeuedFrom[0].Equal(printerTestNow.Add(-2*time.Minute)) {
		t.Errorf("requeued = %v, want jobs claimed more than two minutes ago back in the queue", jobs.requeuedFrom)
	}
}

func TestPrinterServiceNextJobWaits(t *testing.T) {
	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "key"})

	t.Run("nothing arrives", func(t *testing.T) {
		jobs := newFakePrintJobRepo()
		printers := newTestPrinterService(configs, jobs)

		started := time.Now()
		job, err := printers.NextJob(context.Background(), "e1", "key")
		if err != nil || job != nil {
			t.Fatalf("NextJob = %+v, %v; want nothing", job, err)
		}
		if waited := time.Since(started); waited < printers.holdOpenFor {
			t.Errorf("answered after %s, want it to hold the request open for %s", waited, printers.holdOpenFor)
		}
		if jobs.claimCount() < 2 {
			t.Errorf("claims = %d, want it to keep looking", jobs.claimCount())
		}
	})

	t.Run("a job arrives while it waits", func(t *testing.T) {
		jobs := newFakePrintJobRepo()
		printers := newTestPrinterService(configs, jobs)
		printers.holdOpenFor = 5 * time.Second

		go func() {
			time.Sleep(20 * time.Millisecond)
			jobs.add("late-job", "e1", domain.PrintJobPending, domain.PrintTicket{Type: "order"})
		}()

		job, err := printers.NextJob(context.Background(), "e1", "key")
		if err != nil || job == nil || job.ID != "late-job" {
			t.Fatalf("NextJob = %+v, %v; want the late job", job, err)
		}
	})

	t.Run("the bridge hangs up", func(t *testing.T) {
		printers := newTestPrinterService(configs, newFakePrintJobRepo())
		printers.holdOpenFor = 5 * time.Second

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
		defer cancel()

		if job, err := printers.NextJob(ctx, "e1", "key"); !errors.Is(err, context.DeadlineExceeded) || job != nil {
			t.Fatalf("NextJob = %+v, %v; want the context's error", job, err)
		}
	})

	t.Run("the server shuts down", func(t *testing.T) {
		printers := newTestPrinterService(configs, newFakePrintJobRepo())
		printers.holdOpenFor = 5 * time.Second

		go func() {
			time.Sleep(20 * time.Millisecond)
			printers.StopWaiting()
		}()

		started := time.Now()
		if job, err := printers.NextJob(context.Background(), "e1", "key"); err != nil || job != nil {
			t.Fatalf("NextJob = %+v, %v; want nothing", job, err)
		}
		if waited := time.Since(started); waited > time.Second {
			t.Errorf("answered after %s, want it to stop waiting at the shutdown", waited)
		}

		printers.StopWaiting()
	})
}

func TestPrinterServiceReportResult(t *testing.T) {
	outOfPaper := "out of paper"
	unexplained := domain.PrintJobUnexplainedError
	empty := ""

	tests := []struct {
		name       string
		result     domain.PrintJobResult
		wantStatus domain.PrintJobStatus
		wantError  *string
	}{
		{name: "printed", result: domain.PrintJobResult{Printed: true}, wantStatus: domain.PrintJobPrinted},
		{name: "failed with a reason", result: domain.PrintJobResult{Error: &outOfPaper}, wantStatus: domain.PrintJobFailed, wantError: &outOfPaper},
		{name: "failed without a reason", result: domain.PrintJobResult{}, wantStatus: domain.PrintJobFailed, wantError: &unexplained},
		{name: "failed with an empty reason", result: domain.PrintJobResult{Error: &empty}, wantStatus: domain.PrintJobFailed, wantError: &empty},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "key"})
			jobs := newFakePrintJobRepo()
			jobs.add("job-1", "e1", domain.PrintJobPrinting, domain.PrintTicket{Type: "raw"})
			printers := newTestPrinterService(configs, jobs)

			if err := printers.ReportResult(context.Background(), "e1", "job-1", "key", tt.result); err != nil {
				t.Fatal(err)
			}

			job := jobs.get("job-1")
			sameError := (tt.wantError == nil && job.Error == nil) || (tt.wantError != nil && job.Error != nil && *job.Error == *tt.wantError)
			if job.Status != tt.wantStatus || !sameError || job.CompletedAt == nil {
				t.Errorf("job = %+v, want %s with error %v", job, tt.wantStatus, tt.wantError)
			}
			if seen := configs.get("e1").LastSeenAt; seen == nil {
				t.Error("the bridge should be recorded as alive")
			}
		})
	}

	configs := newFakePrinterConfigRepo(domain.PrinterConfig{EstablishmentID: "e1", DeviceKey: "key"})
	jobs := newFakePrintJobRepo()
	jobs.add("elsewhere", "e2", domain.PrintJobPrinting, domain.PrintTicket{Type: "raw"})
	printers := newTestPrinterService(configs, jobs)

	for _, jobID := range []string{"elsewhere", "nope"} {
		err := printers.ReportResult(context.Background(), "e1", jobID, "key", domain.PrintJobResult{Printed: true})
		if !isPrinterError(err, domain.KindNotFound, domain.CodePrintJobNotFound) {
			t.Errorf("ReportResult(%s) = %v, want 404 %s", jobID, err, domain.CodePrintJobNotFound)
		}
	}
	if jobs.get("elsewhere").Status != domain.PrintJobPrinting {
		t.Error("a job of another establishment should not change")
	}
}
