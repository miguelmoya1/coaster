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

func (OrderCreatedEvent) Name() string { return "OrderCreatedEvent" }

type OrderItemsAddedEvent struct {
	EstablishmentID string
	Order           Order
	AddedItems      []OrderStockLine
}

func (OrderItemsAddedEvent) Name() string { return "OrderItemsAddedEvent" }

type OrderItemRemovedEvent struct {
	EstablishmentID string
	Order           Order
	RemovedItem     OrderStockLine
}

func (OrderItemRemovedEvent) Name() string { return "OrderItemRemovedEvent" }

type OrderUpdatedEvent struct {
	EstablishmentID string
	Order           Order
}

func (OrderUpdatedEvent) Name() string { return "OrderUpdatedEvent" }

type OrderCancelledEvent struct {
	EstablishmentID string
	Order           Order
	TableID         *string
}

func (OrderCancelledEvent) Name() string { return "OrderCancelledEvent" }

type OrderClosedEvent struct {
	EstablishmentID string
	Order           Order
	TableID         *string
}

func (OrderClosedEvent) Name() string { return "OrderClosedEvent" }

type OrderTableMovedEvent struct {
	EstablishmentID string
	Order           Order
	OldTableID      *string
	NewTableID      string
}

func (OrderTableMovedEvent) Name() string { return "OrderTableMovedEvent" }

type OrdersMergedEvent struct {
	EstablishmentID string
	PrimaryOrder    Order
	SourceOrders    []MergedOrder
}

func (OrdersMergedEvent) Name() string { return "OrdersMergedEvent" }

type OrderDeletedEvent struct {
	EstablishmentID string
	OrderID         string
}

func (OrderDeletedEvent) Name() string { return "OrderDeletedEvent" }

type OrderTipUpdatedEvent struct {
	EstablishmentID string
	OrderID         string
	TipAmount       int
}

func (OrderTipUpdatedEvent) Name() string { return "OrderTipUpdatedEvent" }

type OrderAdjustmentsUpdatedEvent struct {
	EstablishmentID string
	OrderID         string
	Adjustments     []OrderAdjustment
}

func (OrderAdjustmentsUpdatedEvent) Name() string { return "OrderAdjustmentsUpdatedEvent" }
