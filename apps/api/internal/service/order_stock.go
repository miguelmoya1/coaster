package service

import (
	"context"
	"log/slog"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type OrderStock struct {
	products *ProductService
}

func NewOrderStock(products *ProductService) *OrderStock {
	return &OrderStock{products: products}
}

func (s *OrderStock) EventHandlers() []ports.EventHandler {
	return []ports.EventHandler{
		ports.On(func(ctx context.Context, event domain.OrderCreatedEvent) {
			s.adjust(ctx, event.EstablishmentID, stockLinesOf(event.Order.Items), -1)
		}),
		ports.On(func(ctx context.Context, event domain.OrderItemsAddedEvent) {
			s.adjust(ctx, event.EstablishmentID, event.AddedItems, -1)
		}),
		ports.On(func(ctx context.Context, event domain.OrderItemRemovedEvent) {
			s.adjust(ctx, event.EstablishmentID, []domain.OrderStockLine{event.RemovedItem}, 1)
		}),
		ports.On(func(ctx context.Context, event domain.OrderCancelledEvent) {
			s.adjust(ctx, event.EstablishmentID, stockLinesOf(event.Order.Items), 1)
		}),
	}
}

func (s *OrderStock) adjust(ctx context.Context, establishmentID string, lines []domain.OrderStockLine, sign int) {
	for _, line := range lines {
		delta := sign * line.Quantity
		if err := s.products.AdjustStock(ctx, establishmentID, line.ProductID, delta); err != nil {
			slog.Error("adjusting the stock of an order's product",
				"establishmentId", establishmentID, "productId", line.ProductID, "delta", delta, "error", err)
		}
	}
}

func stockLinesOf(items []domain.OrderItem) []domain.OrderStockLine {
	lines := make([]domain.OrderStockLine, 0, len(items))
	for _, item := range items {
		lines = append(lines, domain.OrderStockLine{ProductID: item.ProductID, Quantity: item.Quantity})
	}
	return lines
}
