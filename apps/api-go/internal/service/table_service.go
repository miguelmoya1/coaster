package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// TableService is the tables module: the tables of an establishment.
type TableService struct {
	tables ports.TableRepository
	events ports.EventPublisher
}

func NewTableService(tables ports.TableRepository, events ports.EventPublisher) *TableService {
	return &TableService{tables: tables, events: events}
}

// List is GetTablesByEstablishmentIdQuery: the tables by name.
func (s *TableService) List(ctx context.Context, establishmentID string) ([]domain.Table, error) {
	tables, err := s.tables.ListOf(ctx, establishmentID)
	if err != nil {
		return nil, err
	}
	if tables == nil {
		tables = []domain.Table{}
	}
	return tables, nil
}

// Create is CreateTableCommand. The table starts FREE.
func (s *TableService) Create(ctx context.Context, establishmentID, name string) error {
	table, err := s.tables.Create(ctx, establishmentID, name)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.TableCreatedEvent{EstablishmentID: establishmentID, Table: table})
	return nil
}

// Update is UpdateTableCommand. Without a name nothing changes, but the event goes out all
// the same, as in Nest.
func (s *TableService) Update(ctx context.Context, establishmentID, tableID string, name *string) error {
	table, err := s.find(ctx, establishmentID, tableID)
	if err != nil {
		return err
	}

	if name != nil {
		renamed, err := s.tables.Rename(ctx, tableID, *name)
		if err != nil {
			return err
		}
		table = renamed
	}

	s.events.Publish(ctx, domain.TableUpdatedEvent{EstablishmentID: establishmentID, Table: table})
	return nil
}

// Delete is DeleteTableCommand. It does not look at the table's orders: they lose the link
// to it, as in Nest.
func (s *TableService) Delete(ctx context.Context, establishmentID, tableID string) error {
	if _, err := s.find(ctx, establishmentID, tableID); err != nil {
		return err
	}

	if err := s.tables.Delete(ctx, tableID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.TableDeletedEvent{EstablishmentID: establishmentID, TableID: tableID})
	return nil
}

// find returns the establishment's table, or TABLE_NOT_FOUND.
func (s *TableService) find(ctx context.Context, establishmentID, tableID string) (domain.Table, error) {
	table, err := s.tables.FindByID(ctx, tableID)
	if err != nil {
		return domain.Table{}, err
	}
	if table == nil || table.EstablishmentID != establishmentID {
		return domain.Table{}, domain.NotFound(domain.CodeTableNotFound)
	}
	return *table, nil
}
