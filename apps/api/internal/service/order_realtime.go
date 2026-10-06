package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type OrderRealtime struct {
	realtime ports.Realtime
}

func NewOrderRealtime(realtime ports.Realtime) *OrderRealtime {
	return &OrderRealtime{realtime: realtime}
}

func (r *OrderRealtime) EventHandlers() []ports.EventHandler {
	return []ports.EventHandler{
		ports.On(func(_ context.Context, event domain.OrderCreatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderCreated, event.Order)
			r.tableStatusChanged(event.EstablishmentID, event.TableID, domain.TableOccupied)
		}),
		ports.On(func(_ context.Context, event domain.OrderItemsAddedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderItemAdded, event.Order)
		}),
		ports.On(func(_ context.Context, event domain.OrderUpdatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderUpdated, event.Order)
		}),
		ports.On(func(_ context.Context, event domain.OrderClosedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderClosed, event.Order)
			r.tableStatusChanged(event.EstablishmentID, event.TableID, domain.TableFree)
		}),
		ports.On(func(_ context.Context, event domain.OrderCancelledEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderCancelled, event.Order)
			r.tableStatusChanged(event.EstablishmentID, event.TableID, domain.TableFree)
		}),
		ports.On(func(_ context.Context, event domain.OrderTableMovedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderUpdated, event.Order)
			r.tableStatusChanged(event.EstablishmentID, event.OldTableID, domain.TableFree)
			r.tableStatusChanged(event.EstablishmentID, &event.NewTableID, domain.TableOccupied)
		}),
		ports.On(func(_ context.Context, event domain.OrdersMergedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderUpdated, event.PrimaryOrder)
			for _, source := range event.SourceOrders {
				r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderCancelled, orderRealtimeID{ID: source.ID})
				r.tableStatusChanged(event.EstablishmentID, source.TableID, domain.TableFree)
			}
		}),
		ports.On(func(_ context.Context, event domain.OrderDeletedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderDeleted, orderRealtimeID{ID: event.OrderID})
		}),
		ports.On(func(_ context.Context, event domain.OrderTipUpdatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderTipUpdated, orderTipPayload{OrderID: event.OrderID, TipAmount: event.TipAmount})
		}),
		ports.On(func(_ context.Context, event domain.OrderAdjustmentsUpdatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeOrderAdjustmentsUpdated,
				orderAdjustmentsPayload{OrderID: event.OrderID, Adjustments: event.Adjustments})
		}),
		ports.On(func(_ context.Context, event domain.TableCreatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeTableCreated, event.Table)
		}),
		ports.On(func(_ context.Context, event domain.TableUpdatedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeTableUpdated, event.Table)
		}),
		ports.On(func(_ context.Context, event domain.TableDeletedEvent) {
			r.realtime.Publish(event.EstablishmentID, domain.RealtimeTableDeleted, orderRealtimeID{ID: event.TableID})
		}),
	}
}

func (r *OrderRealtime) tableStatusChanged(establishmentID string, tableID *string, status domain.TableStatus) {
	if tableID == nil || *tableID == "" {
		return
	}
	r.realtime.Publish(establishmentID, domain.RealtimeTableStatusChanged, tableStatusPayload{ID: *tableID, Status: status})
}

type orderRealtimeID struct {
	ID string `json:"id"`
}

type tableStatusPayload struct {
	ID     string             `json:"id"`
	Status domain.TableStatus `json:"status"`
}

type orderTipPayload struct {
	OrderID   string `json:"orderId"`
	TipAmount int    `json:"tipAmount"`
}

type orderAdjustmentsPayload struct {
	OrderID     string                   `json:"orderId"`
	Adjustments []domain.OrderAdjustment `json:"adjustments"`
}
