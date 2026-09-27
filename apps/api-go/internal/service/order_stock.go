package service

import (
	"context"
	"log/slog"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// OrderStockEvents are the events OrderStock.Adjust listens to.
var OrderStockEvents = []string{
	domain.OrderCreatedEvent{}.Name(),
	domain.OrderItemsAddedEvent{}.Name(),
	domain.OrderItemRemovedEvent{}.Name(),
	domain.OrderCancelledEvent{}.Name(),
}

// OrderStock takes out of stock what an order sells and puts back what it gives back:
// orders.sagas.ts in Nest. Merging, deleting and the bulk update leave the stock alone.
type OrderStock struct {
	products *ProductService
}

func NewOrderStock(products *ProductService) *OrderStock {
	return &OrderStock{products: products}
}

// Adjust calls ProductService.AdjustStock once per product line of the event. A line that
// fails (a product deleted since, for example) is logged and the others go ahead, as each
// command of the saga does in Nest.
func (s *OrderStock) Adjust(ctx context.Context, event ports.Event) {
	var establishmentID string
	var changes []domain.OrderStockLine

	switch e := event.(type) {
	case domain.OrderCreatedEvent:
		establishmentID = e.EstablishmentID
		for _, item := range e.Order.Items {
			changes = append(changes, domain.OrderStockLine{ProductID: item.ProductID, Quantity: -item.Quantity})
		}
	case domain.OrderItemsAddedEvent:
		establishmentID = e.EstablishmentID
		for _, line := range e.AddedItems {
			changes = append(changes, domain.OrderStockLine{ProductID: line.ProductID, Quantity: -line.Quantity})
		}
	case domain.OrderItemRemovedEvent:
		establishmentID = e.EstablishmentID
		changes = append(changes, e.RemovedItem)
	case domain.OrderCancelledEvent:
		establishmentID = e.EstablishmentID
		for _, item := range e.Order.Items {
			changes = append(changes, domain.OrderStockLine{ProductID: item.ProductID, Quantity: item.Quantity})
		}
	}

	for _, change := range changes {
		if err := s.products.AdjustStock(ctx, establishmentID, change.ProductID, change.Quantity); err != nil {
			slog.Error("adjusting the stock of an order's product",
				"event", event.Name(), "productId", change.ProductID, "delta", change.Quantity, "error", err)
		}
	}
}
