package service

import (
	"testing"

	"coaster-api/internal/core/domain"
)

func TestOrderStockAdjust(t *testing.T) {
	newStock := func() (*OrderStock, *fakeProductRepo, *catalogEvents) {
		products := newFakeProductRepo()
		products.products["beer"] = domain.ProductRow{ID: "beer", CategoryID: "cat-1", CurrentStock: 10}
		products.products["coke"] = domain.ProductRow{ID: "coke", CategoryID: "cat-1", CurrentStock: 10}
		events := &catalogEvents{}
		return NewOrderStock(NewProductService(products, events)), products, events
	}

	order := domain.Order{Items: []domain.OrderItem{{ProductID: "beer", Quantity: 2}, {ProductID: "coke", Quantity: 1}}}

	tests := []struct {
		name       string
		event      any
		beer, coke int
	}{
		{"an order sells its lines", domain.OrderCreatedEvent{EstablishmentID: "est-1", Order: order}, 8, 9},
		{"added lines are sold", domain.OrderItemsAddedEvent{EstablishmentID: "est-1", Order: order,
			AddedItems: []domain.OrderStockLine{{ProductID: "coke", Quantity: 3}}}, 10, 7},
		{"a removed line goes back", domain.OrderItemRemovedEvent{EstablishmentID: "est-1", Order: order,
			RemovedItem: domain.OrderStockLine{ProductID: "beer", Quantity: 2}}, 12, 10},
		{"a cancelled order gives everything back", domain.OrderCancelledEvent{EstablishmentID: "est-1", Order: order}, 12, 11},
		{"closing leaves the stock alone", domain.OrderClosedEvent{EstablishmentID: "est-1", Order: order}, 10, 10},
		{"merging leaves the stock alone", domain.OrdersMergedEvent{EstablishmentID: "est-1", PrimaryOrder: order}, 10, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stock, products, _ := newStock()
			deliver(stock.EventHandlers(), tt.event)

			if beer, coke := products.products["beer"].CurrentStock, products.products["coke"].CurrentStock; beer != tt.beer || coke != tt.coke {
				t.Errorf("stock = %d beer, %d coke; want %d and %d", beer, coke, tt.beer, tt.coke)
			}
		})
	}
}

func TestOrderStockGoesOnWhenAProductIsGone(t *testing.T) {
	products := newFakeProductRepo()
	products.products["coke"] = domain.ProductRow{ID: "coke", CategoryID: "cat-1", CurrentStock: 10}
	events := &catalogEvents{}
	stock := NewOrderStock(NewProductService(products, events))

	deliver(stock.EventHandlers(), domain.OrderCancelledEvent{EstablishmentID: "est-1", Order: domain.Order{
		Items: []domain.OrderItem{{ProductID: "deleted", Quantity: 1}, {ProductID: "coke", Quantity: 2}},
	}})

	if products.products["coke"].CurrentStock != 12 {
		t.Errorf("coke stock = %d, want 12", products.products["coke"].CurrentStock)
	}
	if len(events.events) != 1 || eventName(events.events[0]) != "ProductStockChangedEvent" {
		t.Errorf("events = %v", events.events)
	}
}
