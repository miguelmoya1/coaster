package domain

type ProductCreatedEvent struct {
	EstablishmentID string
	Product         Product
}

type ProductUpdatedEvent struct {
	EstablishmentID string
	Product         Product
}

type ProductStockChangedEvent struct {
	EstablishmentID string
	Product         Product
}

type ProductDeletedEvent struct {
	EstablishmentID string
	ProductID       string
}
