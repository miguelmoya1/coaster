package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

var OrderRealtimeEvents = []string{
	domain.OrderCreatedEvent{}.Name(),
	domain.OrderItemsAddedEvent{}.Name(),
	domain.OrderUpdatedEvent{}.Name(),
	domain.OrderClosedEvent{}.Name(),
	domain.OrderCancelledEvent{}.Name(),
	domain.OrderTableMovedEvent{}.Name(),
	domain.OrdersMergedEvent{}.Name(),
	domain.OrderDeletedEvent{}.Name(),
	domain.OrderTipUpdatedEvent{}.Name(),
	domain.OrderAdjustmentsUpdatedEvent{}.Name(),
	domain.TableCreatedEvent{}.Name(),
	domain.TableUpdatedEvent{}.Name(),
	domain.TableDeletedEvent{}.Name(),
}

type OrderRealtime struct {
	realtime ports.Realtime
}

func NewOrderRealtime(realtime ports.Realtime) *OrderRealtime {
	return &OrderRealtime{realtime: realtime}
}

func (r *OrderRealtime) Forward(_ context.Context, event ports.Event) {
	switch e := event.(type) {
	case domain.OrderCreatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderCreated, e.Order)
		r.tableStatusChanged(e.EstablishmentID, e.TableID, domain.TableOccupied)

	case domain.OrderItemsAddedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderItemAdded, e.Order)

	case domain.OrderUpdatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderUpdated, e.Order)

	case domain.OrderClosedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderClosed, e.Order)
		r.tableStatusChanged(e.EstablishmentID, e.TableID, domain.TableFree)

	case domain.OrderCancelledEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderCancelled, e.Order)
		r.tableStatusChanged(e.EstablishmentID, e.TableID, domain.TableFree)

	case domain.OrderTableMovedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderUpdated, e.Order)
		r.tableStatusChanged(e.EstablishmentID, e.OldTableID, domain.TableFree)
		r.tableStatusChanged(e.EstablishmentID, &e.NewTableID, domain.TableOccupied)

	case domain.OrdersMergedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderUpdated, e.PrimaryOrder)
		for _, source := range e.SourceOrders {
			r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderCancelled, orderRealtimeID{ID: source.ID})
			r.tableStatusChanged(e.EstablishmentID, source.TableID, domain.TableFree)
		}

	case domain.OrderDeletedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderDeleted, orderRealtimeID{ID: e.OrderID})

	case domain.OrderTipUpdatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderTipUpdated, orderTipPayload{OrderID: e.OrderID, TipAmount: e.TipAmount})

	case domain.OrderAdjustmentsUpdatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeOrderAdjustmentsUpdated,
			orderAdjustmentsPayload{OrderID: e.OrderID, Adjustments: e.Adjustments})

	case domain.TableCreatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeTableCreated, e.Table)

	case domain.TableUpdatedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeTableUpdated, e.Table)

	case domain.TableDeletedEvent:
		r.realtime.Publish(e.EstablishmentID, domain.RealtimeTableDeleted, orderRealtimeID{ID: e.TableID})
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
