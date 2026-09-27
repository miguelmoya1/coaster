package domain

// The table events, as tables/events/impl in Nest. Name returns the class name.

type TableCreatedEvent struct {
	EstablishmentID string
	Table           Table
}

func (TableCreatedEvent) Name() string { return "TableCreatedEvent" }

type TableUpdatedEvent struct {
	EstablishmentID string
	Table           Table
}

func (TableUpdatedEvent) Name() string { return "TableUpdatedEvent" }

type TableDeletedEvent struct {
	EstablishmentID string
	TableID         string
}

func (TableDeletedEvent) Name() string { return "TableDeletedEvent" }
