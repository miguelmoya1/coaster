package service

import (
	"context"
	"reflect"
	"slices"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

type fakeEstablishmentRepo struct {
	created  []domain.NewEstablishment
	settings *domain.EstablishmentSettings
	saved    []domain.EstablishmentSettingsChanges
	err      error
}

func (r *fakeEstablishmentRepo) Create(_ context.Context, establishment domain.NewEstablishment) (domain.Establishment, error) {
	if r.err != nil {
		return domain.Establishment{}, r.err
	}
	r.created = append(r.created, establishment)
	return domain.Establishment{ID: "e-new", Name: establishment.Name}, nil
}

func (r *fakeEstablishmentRepo) ListForMember(context.Context, string) ([]domain.Establishment, error) {
	return []domain.Establishment{{ID: "e1", Name: "Mine"}}, r.err
}

func (r *fakeEstablishmentRepo) FindByID(_ context.Context, establishmentID string) (*domain.Establishment, error) {
	if establishmentID != "e1" {
		return nil, r.err
	}
	return &domain.Establishment{ID: "e1", Name: "Mine"}, r.err
}

func (r *fakeEstablishmentRepo) FindSettings(context.Context, string) (*domain.EstablishmentSettings, error) {
	return r.settings, r.err
}

func (r *fakeEstablishmentRepo) SaveSettings(_ context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error) {
	if r.err != nil {
		return domain.EstablishmentSettings{}, r.err
	}
	r.saved = append(r.saved, changes)

	saved := domain.EstablishmentSettings{EstablishmentID: establishmentID, Modules: changes.Modules, Language: "es"}
	if changes.Language != nil {
		saved.Language = *changes.Language
	}
	if changes.MarkSoldOut != nil {
		saved.MarkSoldOut = *changes.MarkSoldOut
	}
	return saved, nil
}

var establishmentNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

func newTestEstablishmentService(repo *fakeEstablishmentRepo) (*EstablishmentService, *recordedEvents, *fakeCache) {
	events := &recordedEvents{}
	cache := newFakeCache()
	establishments := NewEstablishmentService(repo, events, cache)
	establishments.now = func() time.Time { return establishmentNow }
	return establishments, events, cache
}

func TestEstablishmentServiceCreate(t *testing.T) {
	tests := []struct {
		userLanguage string
		wantLanguage string
	}{
		{userLanguage: "es", wantLanguage: "es"},
		{userLanguage: "en", wantLanguage: "en"},
		{userLanguage: "de", wantLanguage: "es"},
	}

	for _, tt := range tests {
		t.Run(tt.userLanguage, func(t *testing.T) {
			repo := &fakeEstablishmentRepo{}
			establishments, events, _ := newTestEstablishmentService(repo)
			owner := domain.User{ID: "u1", Language: tt.userLanguage}

			if err := establishments.Create(context.Background(), owner, "Bar Pepe"); err != nil {
				t.Fatal(err)
			}

			want := domain.NewEstablishment{
				Name:        "Bar Pepe",
				OwnerID:     "u1",
				Modules:     domain.DefaultEstablishmentModules,
				Language:    tt.wantLanguage,
				TrialEndsAt: time.Date(2026, 10, 11, 10, 0, 0, 0, time.UTC),
			}
			if len(repo.created) != 1 || !reflect.DeepEqual(repo.created[0], want) {
				t.Errorf("created = %+v, want %+v", repo.created, want)
			}
			if len(events.events) != 0 {
				t.Errorf("events = %v, want none", events.names())
			}
		})
	}
}

func TestEstablishmentServiceReads(t *testing.T) {
	establishments, _, _ := newTestEstablishmentService(&fakeEstablishmentRepo{})
	ctx := context.Background()

	list, err := establishments.ListFor(ctx, "u1")
	if err != nil || len(list) != 1 || list[0].ID != "e1" {
		t.Errorf("ListFor = %+v, %v", list, err)
	}

	found, err := establishments.Get(ctx, "e1")
	if err != nil || found == nil || found.ID != "e1" {
		t.Errorf("Get(e1) = %+v, %v", found, err)
	}

	missing, err := establishments.Get(ctx, "nope")
	if !domain.HasCode(err, domain.CodeEstablishmentNotFound) || missing != nil {
		t.Errorf("Get(nope) = %+v, %v", missing, err)
	}
}

func TestEstablishmentServiceMissingEstablishment(t *testing.T) {
	repo := &fakeEstablishmentRepo{}
	establishments, events, _ := newTestEstablishmentService(repo)
	ctx := context.Background()

	_, err := establishments.Settings(ctx, "nope")
	if !domain.HasCode(err, domain.CodeEstablishmentNotFound) {
		t.Errorf("Settings(nope) err = %v", err)
	}

	_, err = establishments.UpdateSettings(ctx, "nope", domain.EstablishmentSettingsChanges{})
	if !domain.HasCode(err, domain.CodeEstablishmentNotFound) {
		t.Errorf("UpdateSettings(nope) err = %v", err)
	}
	if len(repo.saved) != 0 || len(events.events) != 0 {
		t.Errorf("saved = %+v, events = %v", repo.saved, events.names())
	}
}

func TestEstablishmentServiceSettings(t *testing.T) {
	configured := domain.NewTime(establishmentNow)

	tests := []struct {
		name   string
		stored *domain.EstablishmentSettings
		want   domain.EstablishmentSettings
	}{
		{
			name:   "without a settings row",
			stored: nil,
			want:   domain.DefaultEstablishmentSettings("e1"),
		},
		{
			name: "stored modules come resolved and an unknown language as Spanish",
			stored: &domain.EstablishmentSettings{
				EstablishmentID: "e1", Modules: []domain.EstablishmentModule{domain.ModuleOrders}, Language: "de", MarkSoldOut: true, ConfiguredAt: &configured,
			},
			want: domain.EstablishmentSettings{
				EstablishmentID: "e1",
				Modules:         []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory},
				Language:        "es",
				MarkSoldOut:     true,
				ConfiguredAt:    &configured,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			establishments, _, _ := newTestEstablishmentService(&fakeEstablishmentRepo{settings: tt.stored})

			got, err := establishments.Settings(context.Background(), "e1")
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("got %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestEstablishmentServiceUpdateSettings(t *testing.T) {
	repo := &fakeEstablishmentRepo{}
	establishments, events, _ := newTestEstablishmentService(repo)

	english := "en"
	soldOut := true
	got, err := establishments.UpdateSettings(context.Background(), "e1", domain.EstablishmentSettingsChanges{
		Modules: []domain.EstablishmentModule{domain.ModuleOrders}, Language: &english, MarkSoldOut: &soldOut,
	})
	if err != nil {
		t.Fatal(err)
	}

	resolved := []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory}
	if len(repo.saved) != 1 || !slices.Equal(repo.saved[0].Modules, resolved) || *repo.saved[0].Language != "en" || !*repo.saved[0].MarkSoldOut {
		t.Errorf("saved = %+v", repo.saved)
	}
	if !slices.Equal(got.Modules, resolved) || got.Language != "en" || !got.MarkSoldOut {
		t.Errorf("got %+v", got)
	}

	if len(events.events) != 1 || events.events[0] != (domain.EstablishmentSettingsUpdated{EstablishmentID: "e1"}) {
		t.Errorf("events = %+v", events.events)
	}
}

func TestEstablishmentServiceUpdateSettingsFails(t *testing.T) {
	establishments, events, _ := newTestEstablishmentService(&fakeEstablishmentRepo{err: errDatabaseDown})

	_, err := establishments.UpdateSettings(context.Background(), "e1", domain.EstablishmentSettingsChanges{})
	if err != errDatabaseDown {
		t.Errorf("err = %v", err)
	}
	if len(events.events) != 0 {
		t.Errorf("published %v after a failed save", events.names())
	}
}

func TestEstablishmentServiceForgetModulesCache(t *testing.T) {
	establishments, _, cache := newTestEstablishmentService(&fakeEstablishmentRepo{})
	ctx := context.Background()

	establishments.ForgetModulesCache(ctx, domain.UserUpdated{UserID: "u1"})
	establishments.ForgetModulesCache(ctx, domain.EstablishmentSettingsUpdated{EstablishmentID: "e1"})

	if !slices.Equal(cache.forgotten, []string{"establishment:e1:modules"}) {
		t.Errorf("forgotten = %v", cache.forgotten)
	}
}
