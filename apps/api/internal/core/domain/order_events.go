package domain

type OrderStockLine struct {
	ProductID string
	Quantity  int
}

type OrderCreatedEvent struct {
	EstablishmentID string
	Order           Order
	TableID         *string
}

type OrderItemsAddedEvent struct {
	EstablishmentID string
	Order           Order
	AddedItems      []OrderStockLine
}

type OrderItemRemovedEvent struct {
	EstablishmentID string
	Order           Order
	RemovedItem     OrderStockLine
}

type OrderUpdatedEvent struct {
	EstablishmentID string
	Order           Order
}

type OrderCancelledEvent struct {
	EstablishmentID string
	Order           Order
	TableID         *string
}

type OrderClosedEvent struct {
	EstablishmentID string
	Order           Order
	TableID         *string
}

type OrderTableMovedEvent struct {
	EstablishmentID string
	Order           Order
	OldTableID      *string
	NewTableID      string
}

type OrdersMergedEvent struct {
	EstablishmentID string
	PrimaryOrder    Order
	SourceOrders    []MergedOrder
}

type OrderDeletedEvent struct {
	EstablishmentID string
	OrderID         string
}

type OrderTipUpdatedEvent struct {
	EstablishmentID string
	OrderID         string
	TipAmount       int
}

type OrderAdjustmentsUpdatedEvent struct {
	EstablishmentID string
	OrderID         string
	Adjustments     []OrderAdjustment
}
