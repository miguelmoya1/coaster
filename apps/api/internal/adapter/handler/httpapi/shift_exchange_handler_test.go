package httpapi

import (
	"context"
	"net/http"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

type fakeShiftExchangeService struct {
	listPendingFn func(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error)
	requestFn     func(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error
	acceptFn      func(ctx context.Context, establishmentID, exchangeID, userID string) error
	deleteFn      func(ctx context.Context, establishmentID, exchangeID, userID string) error
}

func (f *fakeShiftExchangeService) ListPending(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error) {
	if f.listPendingFn != nil {
		return f.listPendingFn(ctx, establishmentID)
	}
	return nil, nil
}

func (f *fakeShiftExchangeService) Request(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error {
	if f.requestFn != nil {
		return f.requestFn(ctx, establishmentID, shiftID, requesterID, targetID)
	}
	return nil
}

func (f *fakeShiftExchangeService) Accept(ctx context.Context, establishmentID, exchangeID, userID string) error {
	if f.acceptFn != nil {
		return f.acceptFn(ctx, establishmentID, exchangeID, userID)
	}
	return nil
}

func (f *fakeShiftExchangeService) Delete(ctx context.Context, establishmentID, exchangeID, userID string) error {
	if f.deleteFn != nil {
		return f.deleteFn(ctx, establishmentID, exchangeID, userID)
	}
	return nil
}

func TestShiftExchangeHandler(t *testing.T) {
	svc := &fakeShiftExchangeService{}
	guard := testGuard(fakeAccess{platformRole: domain.RoleAdmin})
	mux := http.NewServeMux()
	NewShiftExchangeHandler(svc).RegisterRoutes(mux, guard)

	signedIn := map[string]string{"Authorization": "Bearer good"}

	// 1. List success
	now := domain.NewInstant(time.Now().UTC())
	svc.listPendingFn = func(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error) {
		return []domain.ShiftExchange{
			{ID: "ex1", ShiftID: "s1", RequesterName: "Ana", ShiftStartTime: now},
		}, nil
	}
	resp := send(mux, "GET", "/api/v1/establishments/e1/exchanges", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("list status = %d, want 200", resp.Code)
	}

	// List error
	svc.listPendingFn = func(ctx context.Context, establishmentID string) ([]domain.ShiftExchange, error) {
		return nil, domain.NotFound("ESTABLISHMENT_NOT_FOUND")
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/exchanges", "", signedIn)
	if resp.Code != http.StatusNotFound {
		t.Errorf("list error status = %d, want 404", resp.Code)
	}

	// 2. Request success
	svc.requestFn = func(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error {
		return nil
	}
	validUUID := "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts/s1/exchanges", `{"targetId":"`+validUUID+`"}`, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("request status = %d, want 201", resp.Code)
	}

	// Request JSON decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts/s1/exchanges", `{"targetId": 123}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("request decode error status = %d, want 400", resp.Code)
	}

	// Request service error
	svc.requestFn = func(ctx context.Context, establishmentID, shiftID, requesterID string, targetID *string) error {
		return domain.Conflict("EXCHANGE_ALREADY_PENDING")
	}
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts/s1/exchanges", `{}`, signedIn)
	if resp.Code != http.StatusConflict {
		t.Errorf("request conflict status = %d, want 409", resp.Code)
	}

	// 3. Accept success
	svc.acceptFn = func(ctx context.Context, establishmentID, exchangeID, userID string) error {
		return nil
	}
	resp = send(mux, "PATCH", "/api/v1/establishments/e1/exchanges/ex1/accept", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("accept status = %d, want 200", resp.Code)
	}

	// Accept error
	svc.acceptFn = func(ctx context.Context, establishmentID, exchangeID, userID string) error {
		return domain.BadRequest("CANNOT_ACCEPT_OWN_EXCHANGE")
	}
	resp = send(mux, "PATCH", "/api/v1/establishments/e1/exchanges/ex1/accept", "", signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("accept error status = %d, want 400", resp.Code)
	}

	// 4. Delete success
	svc.deleteFn = func(ctx context.Context, establishmentID, exchangeID, userID string) error {
		return nil
	}
	resp = send(mux, "DELETE", "/api/v1/establishments/e1/exchanges/ex1", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("delete status = %d, want 200", resp.Code)
	}

	// Delete error
	svc.deleteFn = func(ctx context.Context, establishmentID, exchangeID, userID string) error {
		return domain.NotFound("EXCHANGE_NOT_FOUND")
	}
	resp = send(mux, "DELETE", "/api/v1/establishments/e1/exchanges/ex1", "", signedIn)
	if resp.Code != http.StatusNotFound {
		t.Errorf("delete error status = %d, want 404", resp.Code)
	}
}
