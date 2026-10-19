package httpapi

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

type fakeShiftService struct {
	listFn   func(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error)
	createFn func(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error
	deleteFn func(ctx context.Context, establishmentID, shiftID string) error
}

func (f *fakeShiftService) List(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error) {
	if f.listFn != nil {
		return f.listFn(ctx, establishmentID, startDate, endDate)
	}
	return nil, nil
}

func (f *fakeShiftService) Create(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error {
	if f.createFn != nil {
		return f.createFn(ctx, establishmentID, input)
	}
	return nil
}

func (f *fakeShiftService) Delete(ctx context.Context, establishmentID, shiftID string) error {
	if f.deleteFn != nil {
		return f.deleteFn(ctx, establishmentID, shiftID)
	}
	return nil
}

func TestShiftHandler(t *testing.T) {
	svc := &fakeShiftService{}
	guard := testGuard(fakeAccess{platformRole: domain.RoleAdmin})
	mux := http.NewServeMux()
	NewShiftHandler(svc).RegisterRoutes(mux, guard)

	signedIn := map[string]string{"Authorization": "Bearer good"}

	// 1. List success
	now := domain.NewInstant(time.Now().UTC())
	svc.listFn = func(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error) {
		return []domain.Shift{
			{ID: "s1", EstablishmentID: establishmentID, UserID: "u1", StartTime: now, EndTime: domain.NewInstant(now.Add(4 * time.Hour))},
		}, nil
	}
	resp := send(mux, "GET", "/api/v1/establishments/e1/shifts?startDate=2026-09-01&endDate=2026-09-30", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("list status = %d, want 200", resp.Code)
	}

	// List error
	svc.listFn = func(ctx context.Context, establishmentID, startDate, endDate string) ([]domain.Shift, error) {
		return nil, domain.NotFound("ESTABLISHMENT_NOT_FOUND")
	}
	resp = send(mux, "GET", "/api/v1/establishments/e1/shifts", "", signedIn)
	if resp.Code != http.StatusNotFound {
		t.Errorf("list error status = %d, want 404", resp.Code)
	}

	// 2. Create success
	validUUID := "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
	svc.createFn = func(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error {
		if input.UserID != validUUID {
			return errors.New("wrong user ID")
		}
		return nil
	}
	body := `{"userId":"` + validUUID + `","startTime":"2026-09-27T08:00:00Z","endTime":"2026-09-27T16:00:00Z","notes":"Morning"}`
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts", body, signedIn)
	if resp.Code != http.StatusCreated {
		t.Errorf("create status = %d, want 201; body = %s", resp.Code, resp.Body.String())
	}

	// Create JSON decode error
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts", `{"userId": 123}`, signedIn)
	if resp.Code != http.StatusBadRequest {
		t.Errorf("create decode error status = %d, want 400", resp.Code)
	}

	// Create service error
	svc.createFn = func(ctx context.Context, establishmentID string, input domain.CreateShiftInput) error {
		return domain.Conflict("OVERLAPPING_SHIFT")
	}
	resp = send(mux, "POST", "/api/v1/establishments/e1/shifts", body, signedIn)
	if resp.Code != http.StatusConflict {
		t.Errorf("create service error status = %d, want 409", resp.Code)
	}

	// 3. Delete success
	svc.deleteFn = func(ctx context.Context, establishmentID, shiftID string) error {
		return nil
	}
	resp = send(mux, "DELETE", "/api/v1/establishments/e1/shifts/s1", "", signedIn)
	if resp.Code != http.StatusOK {
		t.Errorf("delete status = %d, want 200", resp.Code)
	}

	// Delete error
	svc.deleteFn = func(ctx context.Context, establishmentID, shiftID string) error {
		return domain.NotFound("SHIFT_NOT_FOUND")
	}
	resp = send(mux, "DELETE", "/api/v1/establishments/e1/shifts/s1", "", signedIn)
	if resp.Code != http.StatusNotFound {
		t.Errorf("delete error status = %d, want 404", resp.Code)
	}
}
