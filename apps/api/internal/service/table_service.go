package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type TableService struct {
	tables ports.TableRepository
	events ports.EventPublisher
}

func NewTableService(tables ports.TableRepository, events ports.EventPublisher) *TableService {
	return &TableService{tables: tables, events: events}
}

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

func (s *TableService) Create(ctx context.Context, establishmentID, name string) error {
	table, err := s.tables.Create(ctx, establishmentID, name)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.TableCreatedEvent{EstablishmentID: establishmentID, Table: table})
	return nil
}

func (s *TableService) Update(ctx context.Context, establishmentID, tableID string, name *string) error {
	table, err := findTable(ctx, s.tables, establishmentID, tableID)
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

func (s *TableService) Delete(ctx context.Context, establishmentID, tableID string) error {
	if _, err := findTable(ctx, s.tables, establishmentID, tableID); err != nil {
		return err
	}

	if err := s.tables.Delete(ctx, tableID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.TableDeletedEvent{EstablishmentID: establishmentID, TableID: tableID})
	return nil
}

func findTable(ctx context.Context, tables ports.TableRepository, establishmentID, tableID string) (domain.Table, error) {
	table, err := tables.FindByID(ctx, tableID)
	if err != nil {
		return domain.Table{}, err
	}
	if table == nil || table.EstablishmentID != establishmentID {
		return domain.Table{}, domain.NotFound(domain.CodeTableNotFound)
	}
	return *table, nil
}
