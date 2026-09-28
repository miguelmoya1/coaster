package domain

type TableCreatedEvent struct {
	EstablishmentID string
	Table           Table
}

type TableUpdatedEvent struct {
	EstablishmentID string
	Table           Table
}

type TableDeletedEvent struct {
	EstablishmentID string
	TableID         string
}
