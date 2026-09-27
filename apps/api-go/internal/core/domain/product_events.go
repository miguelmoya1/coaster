package domain

// The product events, as products/events/impl in Nest. Name returns the class name.

type ProductCreatedEvent struct {
	EstablishmentID string
	Product         Product
}

func (ProductCreatedEvent) Name() string { return "ProductCreatedEvent" }

type ProductUpdatedEvent struct {
	EstablishmentID string
	Product         Product
}

func (ProductUpdatedEvent) Name() string { return "ProductUpdatedEvent" }

type ProductStockChangedEvent struct {
	EstablishmentID string
	Product         Product
}

func (ProductStockChangedEvent) Name() string { return "ProductStockChangedEvent" }

type ProductDeletedEvent struct {
	EstablishmentID string
	ProductID       string
}

func (ProductDeletedEvent) Name() string { return "ProductDeletedEvent" }
