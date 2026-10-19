package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func insertPrinterEstablishment(t *testing.T, id string) {
	t.Helper()
	_, err := testPool.Exec(context.Background(),
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ($1, 'Bar ' || $1, now())`, id)
	if err != nil {
		t.Fatalf("inserting establishment %s: %v", id, err)
	}
}

func TestPrinterConfigRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	configs := NewPrinterConfigRepository(testPool)
	insertPrinterEstablishment(t, "e1")
	insertPrinterEstablishment(t, "e2")

	if config, err := configs.Find(ctx, "e1"); err != nil || config != nil {
		t.Fatalf("Find before any bridge = %+v, %v", config, err)
	}

	created, err := configs.Create(ctx, "e1")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.EstablishmentID != "e1" || len(created.DeviceKey) != 36 || created.IPAddress != nil ||
		created.Port != domain.DefaultPrinterPort || created.LastSeenAt != nil {
		t.Fatalf("created = %+v", created)
	}

	seenAt := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.100", nil, seenAt); err != nil {
		t.Fatalf("RegisterAddress: %v", err)
	}
	found, err := configs.Find(ctx, "e1")
	if err != nil || found.DeviceKey != created.DeviceKey || *found.IPAddress != "192.168.1.100" ||
		found.Port != domain.DefaultPrinterPort || !found.LastSeenAt.Equal(seenAt) {
		t.Fatalf("after RegisterAddress without a port = %+v, %v", found, err)
	}

	port := 9090
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.101", &port, seenAt.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.102", nil, seenAt.Add(2*time.Minute)); err != nil {
		t.Fatal(err)
	}
	found, _ = configs.Find(ctx, "e1")
	if *found.IPAddress != "192.168.1.102" || found.Port != 9090 || !found.LastSeenAt.Equal(seenAt.Add(2*time.Minute)) {
		t.Fatalf("a missing port should keep the one stored: %+v", found)
	}

	if err := configs.RegisterAddress(ctx, "e2", "10.0.0.5", &port, seenAt); err != nil {
		t.Fatalf("RegisterAddress without a bridge: %v", err)
	}
	other, _ := configs.Find(ctx, "e2")
	if other == nil || other.Port != 9090 || len(other.DeviceKey) != 36 || other.DeviceKey == created.DeviceKey {
		t.Fatalf("RegisterAddress should create the bridge: %+v", other)
	}

	if err := configs.RotateDeviceKey(ctx, "e1", "new-key"); err != nil {
		t.Fatal(err)
	}
	later := seenAt.Add(time.Hour)
	if err := configs.TouchLastSeen(ctx, "e1", later); err != nil {
		t.Fatal(err)
	}
	found, _ = configs.Find(ctx, "e1")
	if found.DeviceKey != "new-key" || !found.LastSeenAt.Equal(later) {
		t.Fatalf("after rotating and touching = %+v", found)
	}

	if _, err := configs.Create(ctx, "e1"); err == nil {
		t.Error("a second bridge for the same establishment should fail")
	}
}
