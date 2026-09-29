package repository

import (
	"context"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func seedEstablishments(t *testing.T) {
	t.Helper()
	resetDB(t)

	for _, statement := range []string{
		`INSERT INTO "User" (id, email, name, "updatedAt") VALUES ('u1', 'ana@example.com', 'Ana', now()), ('u2', 'luis@example.com', 'Luis', now())`,
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Mine', now()), ('e2', 'Left', now()), ('e3', 'Paused', now()), ('e4', 'Theirs', now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "deletedAt", "updatedAt") VALUES
			('m1', 'u1', 'e1', 'STAFF', true, NULL, now()),
			('m2', 'u1', 'e2', 'STAFF', true, now(), now()),
			('m3', 'u1', 'e3', 'STAFF', false, NULL, now()),
			('m4', 'u2', 'e4', 'OWNER', true, NULL, now())`,
		`INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, language, "markSoldOut", "updatedAt")
			VALUES ('s4', 'e4', '{TIME_TRACKING}', 'en', true, now())`,
	} {
		if _, err := testPool.Exec(context.Background(), statement); err != nil {
			t.Fatalf("seeding: %v", err)
		}
	}
}

func TestEstablishmentRepositoryCreate(t *testing.T) {
	seedEstablishments(t)
	ctx := context.Background()
	establishments := NewEstablishmentRepository(testPool)

	trialEndsAt := time.Date(2026, 10, 11, 10, 0, 0, 0, time.UTC)
	created, err := establishments.Create(ctx, domain.NewEstablishment{
		Name: "Bar Pepe", OwnerID: "u1", Modules: domain.DefaultEstablishmentModules, Language: "en", TrialEndsAt: trialEndsAt,
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || created.Name != "Bar Pepe" || created.CreatedAt.IsZero() || !created.UpdatedAt.Equal(created.CreatedAt.Time) {
		t.Errorf("created = %+v", created)
	}

	var role string
	var active bool
	err = testPool.QueryRow(ctx, `SELECT role::text, active FROM "EstablishmentMember" WHERE "establishmentId" = $1 AND "userId" = 'u1'`, created.ID).Scan(&role, &active)
	if err != nil || role != "OWNER" || !active {
		t.Errorf("owner = %s %v, %v", role, active, err)
	}

	var plan, status string
	var trial time.Time
	err = testPool.QueryRow(ctx, `SELECT plan::text, status::text, "trialEndsAt" FROM "EstablishmentSubscription" WHERE "establishmentId" = $1`, created.ID).Scan(&plan, &status, &trial)
	if err != nil || plan != "FREE" || status != "TRIALING" || !trial.Equal(trialEndsAt) {
		t.Errorf("subscription = %s %s %v, %v", plan, status, trial, err)
	}

	settings, err := establishments.FindSettings(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	want := []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleOrders, domain.ModuleInventory}
	if settings == nil || !slices.Equal(settings.Modules, want) || settings.Language != "en" || settings.MarkSoldOut || settings.ConfiguredAt != nil {
		t.Errorf("settings = %+v", settings)
	}
}

func TestEstablishmentRepositoryReads(t *testing.T) {
	seedEstablishments(t)
	ctx := context.Background()
	establishments := NewEstablishmentRepository(testPool)

	list, err := establishments.ListForMember(ctx, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].ID != "e1" || list[0].Name != "Mine" {
		t.Errorf("list = %+v, want only e1", list)
	}

	none, err := establishments.ListForMember(ctx, "nobody")
	if err != nil || none == nil || len(none) != 0 {
		t.Errorf("list of nobody = %#v, %v, want an empty list", none, err)
	}

	found, err := establishments.FindByID(ctx, "e4")
	if err != nil || found == nil || found.Name != "Theirs" {
		t.Errorf("FindByID(e4) = %+v, %v", found, err)
	}

	missing, err := establishments.FindByID(ctx, "nope")
	if err != nil || missing != nil {
		t.Errorf("FindByID(nope) = %+v, %v", missing, err)
	}

	settings, err := establishments.FindSettings(ctx, "e4")
	if err != nil || settings == nil || settings.Language != "en" || !settings.MarkSoldOut || len(settings.Modules) != 1 {
		t.Errorf("FindSettings(e4) = %+v, %v", settings, err)
	}

	noSettings, err := establishments.FindSettings(ctx, "e1")
	if err != nil || noSettings != nil {
		t.Errorf("FindSettings(e1) = %+v, %v", noSettings, err)
	}
}

func TestEstablishmentRepositorySaveSettings(t *testing.T) {
	seedEstablishments(t)
	ctx := context.Background()
	establishments := NewEstablishmentRepository(testPool)

	inventory := []domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleInventory}

	created, err := establishments.SaveSettings(ctx, "e1", domain.EstablishmentSettingsChanges{Modules: inventory})
	if err != nil {
		t.Fatal(err)
	}
	if created.EstablishmentID != "e1" || !slices.Equal(created.Modules, inventory) || created.Language != "es" || created.MarkSoldOut || created.ConfiguredAt == nil {
		t.Errorf("created = %+v", created)
	}

	english := "en"
	soldOut := true
	updated, err := establishments.SaveSettings(ctx, "e1", domain.EstablishmentSettingsChanges{Modules: inventory, Language: &english, MarkSoldOut: &soldOut})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Language != "en" || !updated.MarkSoldOut {
		t.Errorf("updated = %+v", updated)
	}

	kept, err := establishments.SaveSettings(ctx, "e1", domain.EstablishmentSettingsChanges{Modules: []domain.EstablishmentModule{domain.ModuleTimeTracking}})
	if err != nil {
		t.Fatal(err)
	}
	if kept.Language != "en" || !kept.MarkSoldOut || len(kept.Modules) != 1 || kept.ConfiguredAt.Before(created.ConfiguredAt.Time) {
		t.Errorf("a save without language or markSoldOut keeps them: %+v", kept)
	}

	var rows int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM "EstablishmentSettings" WHERE "establishmentId" = 'e1'`).Scan(&rows); err != nil || rows != 1 {
		t.Errorf("settings rows of e1 = %d, %v", rows, err)
	}
}
