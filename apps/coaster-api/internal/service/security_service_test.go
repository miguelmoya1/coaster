package service

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func newTestSecurity(repo *fakeSecurity, refresher *fakeRefresher) (*SecurityService, *fakeCache) {
	cache := newFakeCache()
	var service *SecurityService
	if refresher == nil {
		service = NewSecurityService(repo, cache, nil)
	} else {
		service = NewSecurityService(repo, cache, refresher)
	}
	return service, cache
}

func TestUserRoleIsCached(t *testing.T) {
	repo := &fakeSecurity{roles: map[string]domain.Role{"admin-1": domain.RoleAdmin}}
	service, cache := newTestSecurity(repo, nil)

	for range 2 {
		role, err := service.UserRole(context.Background(), "admin-1")
		if err != nil || role != domain.RoleAdmin {
			t.Fatalf("UserRole = %q, %v", role, err)
		}
	}

	if repo.calls != 1 {
		t.Errorf("the database was asked %d times, want 1", repo.calls)
	}
	if string(cache.values["user:admin-1:role"]) != `"ADMIN"` {
		t.Errorf("cached %s", cache.values["user:admin-1:role"])
	}
}

func TestMissingMembershipStaysCheap(t *testing.T) {
	repo := &fakeSecurity{}
	service, _ := newTestSecurity(repo, nil)

	for range 2 {
		membership, err := service.Membership(context.Background(), "user-1", "est-1")
		if err != nil || membership != nil {
			t.Fatalf("Membership = %+v, %v", membership, err)
		}
	}

	if repo.calls != 1 {
		t.Errorf("a missing membership was looked up %d times, want 1", repo.calls)
	}
}

func TestEnabledModules(t *testing.T) {
	repo := &fakeSecurity{modules: map[string][]domain.EstablishmentModule{
		"orders-only": {domain.ModuleOrders},
	}}
	service, _ := newTestSecurity(repo, nil)

	tests := []struct {
		establishment string
		want          []domain.EstablishmentModule
	}{
		{establishment: "orders-only", want: []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory}},
		{establishment: "no-settings", want: domain.DefaultEstablishmentModules},
	}

	for _, tt := range tests {
		t.Run(tt.establishment, func(t *testing.T) {
			got, err := service.EnabledModules(context.Background(), tt.establishment)
			if err != nil {
				t.Fatal(err)
			}
			if !slices.Equal(got, tt.want) {
				t.Errorf("EnabledModules = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSubscriptionStateReadsNestCache(t *testing.T) {
	service, cache := newTestSecurity(&fakeSecurity{}, nil)

	cache.values["establishment:est-1:subscription"] = []byte(`{"status":"TRIALING","stripeSubscriptionId":null,"currentPeriodEnd":null,"trialEndsAt":"2099-01-01T00:00:00.000Z","manualPlan":null,"manualGrantExpiresAt":null}`)

	state, err := service.SubscriptionState(context.Background(), "est-1")
	if err != nil {
		t.Fatal(err)
	}
	if state == nil || state.Status != domain.SubscriptionTrialing || state.TrialEndsAt == nil || state.TrialEndsAt.Year() != 2099 {
		t.Errorf("state = %+v", state)
	}
}

func TestSubscriptionActive(t *testing.T) {
	stripeID := "sub_1"
	lapsed := &domain.SubscriptionState{Status: domain.SubscriptionUnpaid, StripeSubscriptionID: &stripeID}
	neverSubscribed := &domain.SubscriptionState{Status: domain.SubscriptionExpired}
	paid := &domain.SubscriptionState{Status: domain.SubscriptionActive, StripeSubscriptionID: &stripeID, CurrentPeriodEnd: &domain.Time{Time: time.Now().Add(time.Hour)}}

	tests := []struct {
		name          string
		stored        *domain.SubscriptionState
		refresher     *fakeRefresher
		want          bool
		wantRefreshes int
	}{
		{name: "paid", stored: paid, refresher: &fakeRefresher{}, want: true},
		{name: "Stripe still considers it paid", stored: lapsed, refresher: &fakeRefresher{state: paid}, want: true, wantRefreshes: 1},
		{name: "Stripe agrees it is gone", stored: lapsed, refresher: &fakeRefresher{state: lapsed}, want: false, wantRefreshes: 1},
		{name: "never asks Stripe about one that never subscribed", stored: neverSubscribed, refresher: &fakeRefresher{state: paid}, want: false},
		{name: "Stripe cannot be reached", stored: lapsed, refresher: &fakeRefresher{err: errors.New("timeout")}, want: false, wantRefreshes: 1},
		{name: "no refresher configured", stored: lapsed, want: false},
		{name: "no subscription row", stored: nil, refresher: &fakeRefresher{state: paid}, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeSecurity{subscription: map[string]*domain.SubscriptionState{"est-1": tt.stored}}
			service, _ := newTestSecurity(repo, tt.refresher)

			got, err := service.SubscriptionActive(context.Background(), "est-1")
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Errorf("SubscriptionActive = %v, want %v", got, tt.want)
			}
			if tt.refresher != nil && tt.refresher.calls != tt.wantRefreshes {
				t.Errorf("Stripe was asked %d times, want %d", tt.refresher.calls, tt.wantRefreshes)
			}
		})
	}
}
