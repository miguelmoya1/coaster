package service

import (
	"context"
	"encoding/json"
	"slices"
	"testing"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

func TestOrderRealtimeForward(t *testing.T) {
	order := domain.Order{ID: "o1", EstablishmentID: "e1"}
	table := domain.Table{ID: "t1", EstablishmentID: "e1", Name: "Mesa 1", Status: domain.TableFree}
	oldTable, newTable := "t1", "t2"

	tests := []struct {
		name  string
		event ports.Event
		want  []string
	}{
		{"created at a table", domain.OrderCreatedEvent{EstablishmentID: "e1", Order: order, TableID: &newTable},
			[]string{`orderCreated {"id":"o1"`, `tableStatusChanged {"id":"t2","status":"OCCUPIED"}`}},
		{"created without a table", domain.OrderCreatedEvent{EstablishmentID: "e1", Order: order},
			[]string{`orderCreated {"id":"o1"`}},
		{"items added", domain.OrderItemsAddedEvent{EstablishmentID: "e1", Order: order},
			[]string{`orderItemAdded {"id":"o1"`}},
		{"updated", domain.OrderUpdatedEvent{EstablishmentID: "e1", Order: order},
			[]string{`orderUpdated {"id":"o1"`}},
		{"closed", domain.OrderClosedEvent{EstablishmentID: "e1", Order: order, TableID: &oldTable},
			[]string{`orderClosed {"id":"o1"`, `tableStatusChanged {"id":"t1","status":"FREE"}`}},
		{"cancelled", domain.OrderCancelledEvent{EstablishmentID: "e1", Order: order, TableID: &oldTable},
			[]string{`orderCancelled {"id":"o1"`, `tableStatusChanged {"id":"t1","status":"FREE"}`}},
		{"moved", domain.OrderTableMovedEvent{EstablishmentID: "e1", Order: order, OldTableID: &oldTable, NewTableID: newTable},
			[]string{`orderUpdated {"id":"o1"`, `tableStatusChanged {"id":"t1","status":"FREE"}`, `tableStatusChanged {"id":"t2","status":"OCCUPIED"}`}},
		{"merged", domain.OrdersMergedEvent{EstablishmentID: "e1", PrimaryOrder: order, SourceOrders: []domain.MergedOrder{{ID: "o2", TableID: &oldTable}, {ID: "o3"}}},
			[]string{`orderUpdated {"id":"o1"`, `orderCancelled {"id":"o2"}`, `tableStatusChanged {"id":"t1","status":"FREE"}`, `orderCancelled {"id":"o3"}`}},
		{"deleted", domain.OrderDeletedEvent{EstablishmentID: "e1", OrderID: "o1"},
			[]string{`orderDeleted {"id":"o1"}`}},
		{"tip", domain.OrderTipUpdatedEvent{EstablishmentID: "e1", OrderID: "o1", TipAmount: 150},
			[]string{`orderTipUpdated {"orderId":"o1","tipAmount":150}`}},
		{"discounts", domain.OrderAdjustmentsUpdatedEvent{EstablishmentID: "e1", OrderID: "o1", Adjustments: []domain.OrderAdjustment{}},
			[]string{`orderAdjustmentsUpdated {"orderId":"o1","adjustments":[]}`}},
		{"table created", domain.TableCreatedEvent{EstablishmentID: "e1", Table: table},
			[]string{`tableCreated {"id":"t1","establishmentId":"e1","name":"Mesa 1","status":"FREE"`}},
		{"table updated", domain.TableUpdatedEvent{EstablishmentID: "e1", Table: table},
			[]string{`tableUpdated {"id":"t1"`}},
		{"table deleted", domain.TableDeletedEvent{EstablishmentID: "e1", TableID: "t1"},
			[]string{`tableDeleted {"id":"t1"}`}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			realtime := &orderRealtimeFake{}
			NewOrderRealtime(realtime).Forward(context.Background(), tt.event)

			var got []string
			for _, message := range realtime.messages {
				if message.establishmentID != "e1" {
					t.Errorf("sent to %s", message.establishmentID)
				}
				payload, _ := json.Marshal(message.payload)
				got = append(got, message.event+" "+string(payload))
			}

			if len(got) != len(tt.want) {
				t.Fatalf("sent %q, want %q", got, tt.want)
			}
			for i := range got {
				if len(got[i]) < len(tt.want[i]) || got[i][:len(tt.want[i])] != tt.want[i] {
					t.Errorf("message %d = %s, want it to start with %s", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestOrderRealtimeListensToWhatItForwards(t *testing.T) {
	if slices.Contains(OrderRealtimeEvents, domain.OrderItemRemovedEvent{}.Name()) {
		t.Error("Nest sends nothing for OrderItemRemovedEvent")
	}
	if len(OrderRealtimeEvents) != 13 {
		t.Errorf("listens to %d events, want the 10 of orders with realtime and the 3 of tables", len(OrderRealtimeEvents))
	}
}
