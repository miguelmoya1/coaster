package service

import (
	"context"
	"testing"

	"api-go/internal/core/domain"
)

func newTableFixture() (*TableService, *fakeTableRepo, *orderEventRecorder) {
	tables := newFakeTableRepo(
		domain.Table{ID: "t1", EstablishmentID: "e1", Name: "Terraza", Status: domain.TableOccupied},
		domain.Table{ID: "t2", EstablishmentID: "e1", Name: "Barra", Status: domain.TableFree},
		domain.Table{ID: "t3", EstablishmentID: "e2", Name: "Salón", Status: domain.TableFree},
	)
	events := &orderEventRecorder{}
	return NewTableService(tables, events), tables, events
}

func TestTableServiceList(t *testing.T) {
	service, _, _ := newTableFixture()
	ctx := context.Background()

	tables, err := service.List(ctx, "e1")
	if err != nil || len(tables) != 2 || tables[0].Name != "Barra" {
		t.Fatalf("List = %+v, %v", tables, err)
	}

	none, err := service.List(ctx, "e9")
	if err != nil || none == nil || len(none) != 0 {
		t.Fatalf("List without tables = %#v, %v; want []", none, err)
	}
}

func TestTableServiceCreate(t *testing.T) {
	service, _, events := newTableFixture()

	if err := service.Create(context.Background(), "e1", "Mesa 4"); err != nil {
		t.Fatal(err)
	}

	created, ok := events.events[0].(domain.TableCreatedEvent)
	if !ok || created.EstablishmentID != "e1" || created.Table.Name != "Mesa 4" || created.Table.Status != domain.TableFree {
		t.Fatalf("events = %+v", events.events)
	}
}

func TestTableServiceUpdate(t *testing.T) {
	ctx := context.Background()

	service, tables, events := newTableFixture()
	name := "Terraza 1"
	if err := service.Update(ctx, "e1", "t1", &name); err != nil {
		t.Fatal(err)
	}
	updated, ok := events.events[0].(domain.TableUpdatedEvent)
	if !ok || updated.Table.Name != name || updated.Table.Status != domain.TableOccupied || tables.tables["t1"].Name != name {
		t.Fatalf("events = %+v", events.events)
	}

	service, tables, events = newTableFixture()
	if err := service.Update(ctx, "e1", "t2", nil); err != nil {
		t.Fatal(err)
	}
	if len(tables.renamed) != 0 || len(events.events) != 1 {
		t.Fatalf("without a name: renamed %v, events %v", tables.renamed, events.events)
	}

	for _, tableID := range []string{"t3", "missing"} {
		service, tables, events := newTableFixture()
		if err := service.Update(ctx, "e1", tableID, &name); !domain.HasCode(err, domain.CodeTableNotFound) || len(tables.renamed) != 0 || len(events.events) != 0 {
			t.Errorf("updating %s = %v", tableID, err)
		}
	}
}

func TestTableServiceDelete(t *testing.T) {
	ctx := context.Background()

	service, tables, events := newTableFixture()
	if err := service.Delete(ctx, "e1", "t1"); err != nil {
		t.Fatal(err)
	}
	deleted, ok := events.events[0].(domain.TableDeletedEvent)
	if !ok || deleted.TableID != "t1" || len(tables.deleted) != 1 {
		t.Fatalf("events = %+v", events.events)
	}

	for _, tableID := range []string{"t3", "missing"} {
		service, tables, _ := newTableFixture()
		if err := service.Delete(ctx, "e1", tableID); !domain.HasCode(err, domain.CodeTableNotFound) || len(tables.deleted) != 0 {
			t.Errorf("deleting %s = %v", tableID, err)
		}
	}
}
