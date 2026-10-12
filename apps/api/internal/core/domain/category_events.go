package domain

type CategoryCreatedEvent struct {
	EstablishmentID string
	Category        Category
}

type CategoryUpdatedEvent struct {
	EstablishmentID string
	Category        Category
}

type CategoryDeletedEvent struct {
	EstablishmentID string
	CategoryID      string
}
