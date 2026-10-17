package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestTableRepository(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	tables := NewTableRepository(testPool)

	created, err := tables.Create(ctx, "e1", "Barra")
	if err != nil || created.Status != domain.TableFree || created.EstablishmentID != "e1" || created.CreatedAt.IsZero() {
		t.Fatalf("Create = %+v, %v", created, err)
	}

	listed, err := tables.ListOf(ctx, "e1")
	if err != nil || len(listed) != 3 || listed[0].Name != "Barra" || listed[2].Name != "Mesa 2" {
		t.Fatalf("ListOf = %+v, %v", listed, err)
	}

	renamed, err := tables.Rename(ctx, created.ID, "Barra 1")
	if err != nil || renamed.Name != "Barra 1" || !renamed.UpdatedAt.After(created.UpdatedAt.Add(-time.Millisecond)) {
		t.Fatalf("Rename = %+v, %v", renamed, err)
	}

	if err := setTableStatus(ctx, testPool, created.ID, domain.TableOccupied); err != nil || tableStatusOf(t, created.ID) != domain.TableOccupied {
		t.Fatalf("setTableStatus: %v", err)
	}

	if missing, err := tables.FindByID(ctx, "missing"); err != nil || missing != nil {
		t.Fatalf("FindByID(missing) = %+v, %v", missing, err)
	}

	orders := NewOrderRepository(testPool)
	order := openTestOrder(t, orders, &created.ID, beerLine(1))

	if err := tables.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := tables.FindByID(ctx, created.ID); gone != nil {
		t.Fatal("the table is still there")
	}

	after, err := orders.FindByID(ctx, order.ID)
	if err != nil || after.TableID != nil || after.TableName != nil {
		t.Fatalf("the order of a deleted table = %+v, %v", after, err)
	}

	if err := tables.Delete(ctx, created.ID); !errors.Is(err, errMissingRow) {
		t.Fatalf("deleting it twice = %v", err)
	}
}
