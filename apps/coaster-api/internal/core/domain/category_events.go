package domain

type CategoryCreatedEvent struct {
	EstablishmentID string
	Category        Category
}

func (CategoryCreatedEvent) Name() string { return "CategoryCreatedEvent" }

type CategoryUpdatedEvent struct {
	EstablishmentID string
	Category        Category
}

func (CategoryUpdatedEvent) Name() string { return "CategoryUpdatedEvent" }

type CategoryDeletedEvent struct {
	EstablishmentID string
	CategoryID      string
}

func (CategoryDeletedEvent) Name() string { return "CategoryDeletedEvent" }
