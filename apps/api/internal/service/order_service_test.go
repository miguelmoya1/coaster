package service

import (
	"context"
	"errors"
	"slices"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

var orderToday = time.Date(2026, 9, 27, 12, 0, 0, 0, time.UTC)

type orderFixture struct {
	service *OrderService
	orders  *fakeOrderRepo
	tables  *fakeTableRepo
	events  *eventRecorder
}

func newOrderFixture(orders ...domain.OrderRow) *orderFixture {
	repo := newFakeOrderRepo(orders...)
	tables := newFakeTableRepo(
		domain.Table{ID: "t-free", EstablishmentID: "e1", Name: "Mesa 1", Status: domain.TableFree},
		domain.Table{ID: "t-busy", EstablishmentID: "e1", Name: "Mesa 2", Status: domain.TableOccupied},
		domain.Table{ID: "t-other", EstablishmentID: "e2", Name: "Mesa 9", Status: domain.TableFree},
	)
	events := &eventRecorder{}

	service := NewOrderService(repo, tables, events)
	service.now = func() time.Time { return orderToday }

	return &orderFixture{service: service, orders: repo, tables: tables, events: events}
}

func sampleOpenOrder() domain.OrderRow {
	table := "t-busy"
	return domain.OrderRow{
		ID: "o1", EstablishmentID: "e1", TableID: &table, Status: domain.OrderOpen, TotalAmount: 1300, CreatedAt: orderToday,
		Items: []domain.OrderItemRow{
			{ID: "i1", OrderID: "o1", ProductID: "beer", Quantity: 2, PriceAtPurchase: 500, TaxRateAtPurchase: 1000},
			{ID: "i2", OrderID: "o1", ProductID: "coke", Quantity: 1, PriceAtPurchase: 300, TaxRateAtPurchase: 1000},
		},
		Adjustments: []domain.OrderAdjustmentRow{{ID: "a1", OrderID: "o1", Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 100}},
	}
}

func orderWithStatus(order domain.OrderRow, status domain.OrderStatus) domain.OrderRow {
	order.Status = status
	return order
}

func TestOrderServiceCreate(t *testing.T) {
	longNote := strings.Repeat("ñ", 501)

	f := newOrderFixture()
	err := f.service.Create(context.Background(), "e1", domain.CreateOrderInput{
		CreatedByID: "u1",
		TableID:     new("t-free"),
		Items: []domain.OrderLineInput{
			{ProductID: "beer", Quantity: 2, Notes: &longNote},
			{ProductID: "beer", Quantity: 1, Notes: new("")},
			{ProductID: "coke", Quantity: 1},
		},
		Notes:       new("para llevar"),
		Adjustments: []domain.OrderAdjustmentInput{{Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 10, Reason: new("")}},
	})
	if err != nil {
		t.Fatal(err)
	}

	created := f.orders.created
	if created.EstablishmentID != "e1" || *created.CreatedByID != "u1" || *created.TableID != "t-free" || *created.TableName != "Mesa 1" {
		t.Fatalf("created = %+v", created)
	}
	if created.TotalAmount != 1800 || created.TipAmount != 0 || *created.Notes != "para llevar" {
		t.Fatalf("total %d, tip %d, notes %v", created.TotalAmount, created.TipAmount, created.Notes)
	}
	if len(created.Items) != 3 || created.Items[2].TaxRate != 2100 || created.Items[0].ProductName != "Beer" || created.Items[0].Price != 500 {
		t.Fatalf("items = %+v", created.Items)
	}
	if len([]rune(*created.Items[0].Notes)) != 500 || created.Items[1].Notes != nil {
		t.Fatalf("the notes are not cut like Nest's: %d runes, %v", len([]rune(*created.Items[0].Notes)), created.Items[1].Notes)
	}
	if len(created.Adjustments) != 1 || created.Adjustments[0].Reason != nil {
		t.Fatalf("adjustments = %+v", created.Adjustments)
	}

	event, ok := f.events.events[0].(domain.OrderCreatedEvent)
	if !ok || event.EstablishmentID != "e1" || *event.TableID != "t-free" || event.Order.ID != "order-new" || len(event.Order.Items) != 3 {
		t.Fatalf("event = %+v", f.events.events)
	}
}

func TestOrderServiceCreateRefuses(t *testing.T) {
	tests := []struct {
		name  string
		input domain.CreateOrderInput
		code  string
	}{
		{"a product another establishment sells", domain.CreateOrderInput{Items: []domain.OrderLineInput{{ProductID: "theirs", Quantity: 1}}}, domain.CodeProductNotFound},
		{"a table that does not exist", domain.CreateOrderInput{TableID: new("missing"), Items: []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}}}, domain.CodeTableNotFound},
		{"a table of another establishment", domain.CreateOrderInput{TableID: new("t-other"), Items: []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}}}, domain.CodeTableNotFound},
		{"a table that is taken", domain.CreateOrderInput{TableID: new("t-busy"), Items: []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}}}, domain.CodeTableAlreadyOccupied},
		{"a discount of a line of another order", domain.CreateOrderInput{
			Items:       []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}},
			Adjustments: []domain.OrderAdjustmentInput{{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 1, ItemID: new("i1")}},
		}, domain.CodeOrderItemNotFound},
		{"a discount of a line without the line", domain.CreateOrderInput{
			Items:       []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}},
			Adjustments: []domain.OrderAdjustmentInput{{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 1}},
		}, domain.MessageItemIDRequiredForItemTarget},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newOrderFixture()
			err := f.service.Create(context.Background(), "e1", tt.input)
			if !domain.HasCode(err, tt.code) || len(f.orders.writes) != 0 || len(f.events.events) != 0 {
				t.Fatalf("err = %v, writes = %v; want %s and nothing written", err, f.orders.writes, tt.code)
			}
		})
	}
}

func TestOrderServiceNeedsAnOpenOrderOfTheEstablishment(t *testing.T) {
	commands := map[string]func(s *OrderService, orderID string) error{
		"AddItems": func(s *OrderService, id string) error {
			return s.AddItems(context.Background(), "e1", id, domain.AddOrderItemsInput{Items: []domain.OrderLineInput{{ProductID: "beer", Quantity: 1}}})
		},
		"BulkUpdate": func(s *OrderService, id string) error {
			return s.BulkUpdate(context.Background(), "e1", id, []domain.OrderItemUpdate{{ItemID: "i1", ServedQuantity: new(1)}})
		},
		"Checkout": func(s *OrderService, id string) error {
			return s.Checkout(context.Background(), "e1", id, domain.PaymentCash)
		},
		"Cancel":    func(s *OrderService, id string) error { return s.Cancel(context.Background(), "e1", id) },
		"MoveTable": func(s *OrderService, id string) error { return s.MoveTable(context.Background(), "e1", id, "t-free") },
		"RemoveItem": func(s *OrderService, id string) error {
			return s.RemoveItem(context.Background(), "e1", id, "i1")
		},
		"UpdateTip": func(s *OrderService, id string) error { return s.UpdateTip(context.Background(), "e1", id, 100) },
		"UpdateNotes": func(s *OrderService, id string) error {
			return s.UpdateNotes(context.Background(), "e1", id, domain.UpdateOrderNotesInput{Notes: new("x")})
		},
		"UpdateItemNotes": func(s *OrderService, id string) error {
			return s.UpdateItemNotes(context.Background(), "e1", id, "i1", new("x"))
		},
		"AddAdjustment": func(s *OrderService, id string) error {
			return s.AddAdjustment(context.Background(), "e1", id, domain.OrderAdjustmentInput{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 1})
		},
		"RemoveAdjustment": func(s *OrderService, id string) error {
			return s.RemoveAdjustment(context.Background(), "e1", id, "a1")
		},
	}

	theirs := sampleOpenOrder()
	theirs.ID, theirs.EstablishmentID = "theirs", "e2"
	closed := orderWithStatus(sampleOpenOrder(), domain.OrderClosed)
	closed.ID = "closed"

	for name, command := range commands {
		t.Run(name, func(t *testing.T) {
			for orderID, code := range map[string]string{
				"missing": domain.CodeOrderNotFound,
				"theirs":  domain.CodeOrderNotFound,
				"closed":  domain.CodeOrderNotOpen,
			} {
				f := newOrderFixture(theirs, closed)
				err := command(f.service, orderID)
				if !domain.HasCode(err, code) || len(f.orders.writes) != 0 || len(f.events.events) != 0 {
					t.Errorf("%s order: err = %v, writes = %v; want %s", orderID, err, f.orders.writes, code)
				}
			}
		})
	}
}

func TestOrderServiceGetAndList(t *testing.T) {
	theirs := sampleOpenOrder()
	theirs.ID, theirs.EstablishmentID = "theirs", "e2"
	f := newOrderFixture(sampleOpenOrder(), theirs)
	ctx := context.Background()

	order, err := f.service.Get(ctx, "e1", "o1")
	if err != nil || order.ID != "o1" || order.OrderTotal != 1320 {
		t.Fatalf("Get = %+v, %v", order, err)
	}
	if _, err := f.service.Get(ctx, "e1", "theirs"); !domain.HasCode(err, domain.CodeOrderNotFound) {
		t.Fatalf("Get of another establishment = %v", err)
	}

	orders, err := f.service.List(ctx, "e1", domain.OrderOpen)
	if err != nil || len(orders) != 1 || f.orders.listStatus != domain.OrderOpen {
		t.Fatalf("List = %+v, %v", orders, err)
	}

	none, err := f.service.List(ctx, "e3", "")
	if err != nil || none == nil || len(none) != 0 {
		t.Fatalf("List of an establishment without orders = %#v, %v; want []", none, err)
	}

	if _, err := f.service.List(ctx, "e1", "PAID"); !domain.HasCode(err, domain.CodeInvalidType) {
		t.Fatalf("List with an unknown status = %v; want INVALID_TYPE", err)
	}
}

func TestOrderServiceListByDate(t *testing.T) {
	f := newOrderFixture()

	orders, err := f.service.ListByDate(context.Background(), "e1", "2026-09-27")
	if err != nil || orders == nil {
		t.Fatalf("ListByDate = %#v, %v", orders, err)
	}
	if !f.orders.from.Equal(time.Date(2026, 9, 27, 0, 0, 0, 0, time.UTC)) || !f.orders.to.Equal(time.Date(2026, 9, 28, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("between %s and %s", f.orders.from, f.orders.to)
	}

	var domainErr *domain.Error
	if _, err := f.service.ListByDate(context.Background(), "e1", "27/09/2026"); err == nil || errors.As(err, &domainErr) {
		t.Fatalf("a date that is not one = %v; want a plain error (a 500, as in Nest)", err)
	}
}

func TestOrderServiceAddItems(t *testing.T) {
	f := newOrderFixture(sampleOpenOrder())
	ctx := context.Background()

	err := f.service.AddItems(ctx, "e1", "o1", domain.AddOrderItemsInput{Items: []domain.OrderLineInput{{ProductID: "coke", Quantity: 2}}})
	if err != nil || f.orders.addition.TotalAmount != 1900 || f.orders.addition.ChangeNotes {
		t.Fatalf("err = %v, addition = %+v", err, f.orders.addition)
	}
	added, ok := f.events.events[0].(domain.OrderItemsAddedEvent)
	if !ok || !slices.Equal(added.AddedItems, []domain.OrderStockLine{{ProductID: "coke", Quantity: 2}}) {
		t.Fatalf("event = %+v", f.events.events)
	}

	if err := f.service.AddItems(ctx, "e1", "o1", domain.AddOrderItemsInput{Items: []domain.OrderLineInput{{ProductID: "coke", Quantity: 1}}, ClearNotes: true}); err != nil {
		t.Fatal(err)
	}
	if !f.orders.addition.ChangeNotes || f.orders.addition.Notes != nil {
		t.Fatalf("notes sent as null must empty them: %+v", f.orders.addition)
	}

	err = f.service.AddItems(ctx, "e1", "o1", domain.AddOrderItemsInput{Items: []domain.OrderLineInput{{ProductID: "theirs", Quantity: 1}}})
	if !domain.HasCode(err, domain.CodeProductNotFound) {
		t.Fatalf("a product they do not sell = %v", err)
	}
}

func TestOrderServiceBulkUpdate(t *testing.T) {
	tests := []struct {
		name   string
		update domain.OrderItemUpdate
		code   string
	}{
		{"serves a line", domain.OrderItemUpdate{ItemID: "i1", ServedQuantity: new(2)}, ""},
		{"pays a line", domain.OrderItemUpdate{ItemID: "i1", PaidQuantity: new(1), PaymentMethod: new(domain.PaymentCard)}, ""},
		{"a line of another order", domain.OrderItemUpdate{ItemID: "other", ServedQuantity: new(1)}, domain.CodeOrderItemNotFound},
		{"paying more than there is", domain.OrderItemUpdate{ItemID: "i1", PaidQuantity: new(3)}, domain.MessagePayQuantityExceedsTotal},
		{"paying less than nothing", domain.OrderItemUpdate{ItemID: "i1", PaidQuantity: new(-1)}, domain.MessagePayQuantityCannotBeNegative},
		{"serving more than there is", domain.OrderItemUpdate{ItemID: "i2", ServedQuantity: new(2)}, domain.MessageServeQuantityExceedsTotal},
		{"serving less than nothing", domain.OrderItemUpdate{ItemID: "i2", ServedQuantity: new(-1)}, domain.MessageServeQuantityCannotBeNegative},
		{"paying with NONE", domain.OrderItemUpdate{ItemID: "i1", PaidQuantity: new(1), PaymentMethod: new(domain.PaymentNone)}, domain.CodeInvalidType},
		{"paying with MIXED", domain.OrderItemUpdate{ItemID: "i1", PaidQuantity: new(1), PaymentMethod: new(domain.PaymentMixed)}, domain.CodeInvalidType},
		{"serving with NONE", domain.OrderItemUpdate{ItemID: "i1", ServedQuantity: new(1), PaymentMethod: new(domain.PaymentNone)}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newOrderFixture(sampleOpenOrder())
			err := f.service.BulkUpdate(context.Background(), "e1", "o1", []domain.OrderItemUpdate{tt.update})

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.orders.writes) != 0 {
					t.Fatalf("err = %v, writes = %v; want %s", err, f.orders.writes, tt.code)
				}
				return
			}

			if err != nil || len(f.orders.updates) != 1 || f.events.names()[0] != "OrderUpdatedEvent" {
				t.Fatalf("err = %v, updates = %+v, events = %v", err, f.orders.updates, f.events.names())
			}
		})
	}
}

func TestOrderServiceCheckoutAndCancel(t *testing.T) {
	f := newOrderFixture(sampleOpenOrder())
	ctx := context.Background()

	if err := f.service.Checkout(ctx, "e1", "o1", domain.PaymentCard); err != nil {
		t.Fatal(err)
	}
	closed, ok := f.events.events[0].(domain.OrderClosedEvent)
	if !ok || f.orders.method != domain.PaymentCard || *f.orders.tableID != "t-busy" || *closed.TableID != "t-busy" || closed.Order.Status != domain.OrderClosed {
		t.Fatalf("method %s, table %v, event %+v", f.orders.method, f.orders.tableID, f.events.events)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.Cancel(ctx, "e1", "o1"); err != nil {
		t.Fatal(err)
	}
	cancelled, ok := f.events.events[0].(domain.OrderCancelledEvent)
	if !ok || *cancelled.TableID != "t-busy" || cancelled.Order.Status != domain.OrderCancelled {
		t.Fatalf("event = %+v", f.events.events)
	}
}

func TestOrderServiceMoveTable(t *testing.T) {
	ctx := context.Background()

	f := newOrderFixture(sampleOpenOrder())
	if err := f.service.MoveTable(ctx, "e1", "o1", "t-free"); err != nil {
		t.Fatal(err)
	}
	moved, ok := f.events.events[0].(domain.OrderTableMovedEvent)
	if !ok || *moved.OldTableID != "t-busy" || moved.NewTableID != "t-free" || f.orders.writes[0] != "MoveTable:t-free:Mesa 1" {
		t.Fatalf("writes = %v, events = %+v", f.orders.writes, f.events.events)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.MoveTable(ctx, "e1", "o1", "t-busy"); err != nil || len(f.orders.writes) != 0 || len(f.events.events) != 0 {
		t.Fatalf("moving to its own table: err = %v, writes = %v, events = %v", err, f.orders.writes, f.events.names())
	}

	other := sampleOpenOrder()
	other.ID, other.TableID = "o2", nil
	for tableID, code := range map[string]string{
		"t-busy":  domain.CodeTableAlreadyOccupied,
		"t-other": domain.CodeTableNotFound,
		"missing": domain.CodeTableNotFound,
	} {
		f := newOrderFixture(other)
		if err := f.service.MoveTable(ctx, "e1", "o2", tableID); !domain.HasCode(err, code) || len(f.orders.writes) != 0 {
			t.Errorf("to %s: err = %v, writes = %v; want %s", tableID, err, f.orders.writes, code)
		}
	}
}

func TestOrderServiceMerge(t *testing.T) {
	first := sampleOpenOrder()
	second := sampleOpenOrder()
	second.ID, second.TableID, second.CreatedAt = "o2", nil, orderToday.Add(time.Minute)
	third := sampleOpenOrder()
	third.ID, third.TableID, third.CreatedAt = "o3", new("t-free"), orderToday.Add(2*time.Minute)
	theirs := sampleOpenOrder()
	theirs.ID, theirs.EstablishmentID = "theirs", "e2"
	closed := orderWithStatus(sampleOpenOrder(), domain.OrderClosed)
	closed.ID = "closed"
	fourth := sampleOpenOrder()
	fourth.ID, fourth.TableID, fourth.CreatedAt = "o4", nil, orderToday.Add(3*time.Minute)

	f := newOrderFixture(first, second)
	if err := f.service.Merge(context.Background(), "e1", domain.MergeOrdersInput{OrderIDs: []string{"o1", "o2"}, TargetTableID: new("t-busy")}); err != nil {
		t.Fatalf("merging into the table of one of the orders = %v", err)
	}

	f = newOrderFixture(third, first, second)
	err := f.service.Merge(context.Background(), "e1", domain.MergeOrdersInput{OrderIDs: []string{"o3", "o2", "o1"}, TargetTableID: new("t-free")})
	if err != nil {
		t.Fatal(err)
	}
	merge := f.orders.merge
	if merge.PrimaryID != "o1" || *merge.PrimaryTableID != "t-busy" || *merge.TargetTableID != "t-free" || len(merge.Sources) != 2 ||
		merge.Sources[0].ID != "o2" || merge.Sources[0].TableID != nil || *merge.Sources[1].TableID != "t-free" {
		t.Fatalf("merge = %+v", merge)
	}
	merged, ok := f.events.events[0].(domain.OrdersMergedEvent)
	if !ok || merged.PrimaryOrder.ID != "o1" || len(merged.SourceOrders) != 2 {
		t.Fatalf("event = %+v", f.events.events)
	}

	tests := []struct {
		name  string
		input domain.MergeOrdersInput
		code  string
		kind  domain.ErrorKind
	}{
		{"an order that does not exist", domain.MergeOrdersInput{OrderIDs: []string{"o1", "missing"}}, domain.CodeOrderNotFound, domain.KindNotFound},
		{"the same order twice", domain.MergeOrdersInput{OrderIDs: []string{"o1", "o1"}}, domain.CodeOrderNotFound, domain.KindNotFound},
		{"an order of another establishment", domain.MergeOrdersInput{OrderIDs: []string{"o1", "theirs"}}, domain.CodeOrderNotFound, domain.KindNotFound},
		{"a table another order is using", domain.MergeOrdersInput{OrderIDs: []string{"o2", "o4"}, TargetTableID: new("t-busy")}, domain.CodeTableAlreadyOccupied, domain.KindBadRequest},
		{"an order already closed", domain.MergeOrdersInput{OrderIDs: []string{"o1", "closed"}}, domain.CodeOrderNotOpen, domain.KindBadRequest},
		{"a table of another establishment", domain.MergeOrdersInput{OrderIDs: []string{"o1", "o2"}, TargetTableID: new("t-other")}, domain.CodeTableNotFound, domain.KindNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newOrderFixture(first, second, theirs, closed, fourth)
			err := f.service.Merge(context.Background(), "e1", tt.input)

			var domainErr *domain.Error
			if !errors.As(err, &domainErr) || domainErr.Code != tt.code || domainErr.Kind != tt.kind || len(f.orders.writes) != 0 {
				t.Fatalf("err = %v, writes = %v; want %s (%d)", err, f.orders.writes, tt.code, tt.kind)
			}
		})
	}
}

func TestOrderServiceRemoveItem(t *testing.T) {
	ctx := context.Background()

	f := newOrderFixture(sampleOpenOrder())
	if err := f.service.RemoveItem(ctx, "e1", "o1", "i2"); err != nil {
		t.Fatal(err)
	}
	removed, _ := f.events.events[0].(domain.OrderItemRemovedEvent)
	if f.orders.writes[0] != "RemoveItem:i2" || !slices.Equal(f.events.names(), []string{"OrderItemRemovedEvent", "OrderUpdatedEvent"}) ||
		removed.RemovedItem != (domain.OrderStockLine{ProductID: "coke", Quantity: 1}) {
		t.Fatalf("writes = %v, events = %+v", f.orders.writes, f.events.events)
	}

	lastOne := sampleOpenOrder()
	lastOne.Items = lastOne.Items[:1]
	f = newOrderFixture(lastOne)
	if err := f.service.RemoveItem(ctx, "e1", "o1", "i1"); err != nil {
		t.Fatal(err)
	}
	cancelled, _ := f.events.events[1].(domain.OrderCancelledEvent)
	if f.orders.writes[0] != "RemoveLastItemAndCancel:i1" || *f.orders.tableID != "t-busy" ||
		!slices.Equal(f.events.names(), []string{"OrderItemRemovedEvent", "OrderCancelledEvent"}) || *cancelled.TableID != "t-busy" {
		t.Fatalf("writes = %v, events = %+v", f.orders.writes, f.events.events)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.RemoveItem(ctx, "e1", "o1", "missing"); !domain.HasCode(err, domain.CodeOrderItemNotFound) {
		t.Fatalf("a line that is not there = %v", err)
	}
}

func TestOrderServiceDelete(t *testing.T) {
	closedToday := orderWithStatus(sampleOpenOrder(), domain.OrderClosed)
	inCashClose := orderWithStatus(sampleOpenOrder(), domain.OrderCancelled)
	inCashClose.ID, inCashClose.CashCloseID = "in-close", new("close-1")
	yesterday := orderWithStatus(sampleOpenOrder(), domain.OrderClosed)
	yesterday.ID, yesterday.CreatedAt = "yesterday", time.Date(2026, 9, 26, 23, 59, 59, 0, time.UTC)
	open := sampleOpenOrder()
	open.ID = "open"

	tests := []struct {
		orderID string
		code    string
	}{
		{"o1", ""},
		{"open", domain.MessageCannotDeleteOpenOrder},
		{"in-close", domain.CodeOrderInCashClose},
		{"yesterday", domain.MessageCannotDeletePastOrder},
		{"missing", domain.CodeOrderNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.orderID, func(t *testing.T) {
			f := newOrderFixture(closedToday, inCashClose, yesterday, open)
			err := f.service.Delete(context.Background(), "e1", tt.orderID)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.orders.writes) != 0 {
					t.Fatalf("err = %v, writes = %v; want %s", err, f.orders.writes, tt.code)
				}
				return
			}

			deleted, ok := f.events.events[0].(domain.OrderDeletedEvent)
			if err != nil || !ok || deleted.OrderID != "o1" || f.orders.writes[0] != "Delete" {
				t.Fatalf("err = %v, events = %+v", err, f.events.events)
			}
		})
	}
}

func TestOrderServiceNotesAndTip(t *testing.T) {
	ctx := context.Background()

	f := newOrderFixture(sampleOpenOrder())
	if err := f.service.UpdateNotes(ctx, "e1", "o1", domain.UpdateOrderNotesInput{Notes: new("  sin sal  "), TicketNotes: new("   ")}); err != nil {
		t.Fatal(err)
	}
	notes := f.orders.notes
	if !notes.ChangeNotes || *notes.Notes != "sin sal" || !notes.ChangeTicketNotes || notes.TicketNotes != nil {
		t.Fatalf("notes = %+v", notes)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.UpdateNotes(ctx, "e1", "o1", domain.UpdateOrderNotesInput{TicketNotes: new("gracias")}); err != nil {
		t.Fatal(err)
	}
	if f.orders.notes.ChangeNotes || *f.orders.notes.TicketNotes != "gracias" {
		t.Fatalf("notes = %+v", f.orders.notes)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.UpdateItemNotes(ctx, "e1", "o1", "i1", nil); err != nil || f.orders.itemNotes != nil || f.orders.writes[0] != "UpdateItemNotes:i1" {
		t.Fatalf("without a note: err = %v, notes = %v", err, f.orders.itemNotes)
	}
	if err := f.service.UpdateItemNotes(ctx, "e1", "o1", "nope", new("x")); !domain.HasCode(err, domain.CodeOrderItemNotFound) {
		t.Fatalf("a line that is not there = %v", err)
	}

	f = newOrderFixture(sampleOpenOrder())
	if err := f.service.UpdateTip(ctx, "e1", "o1", 250); err != nil {
		t.Fatal(err)
	}
	tip, ok := f.events.events[0].(domain.OrderTipUpdatedEvent)
	if !ok || tip.TipAmount != 250 || f.orders.tip != 250 {
		t.Fatalf("events = %+v", f.events.events)
	}
	if err := f.service.UpdateTip(ctx, "e1", "o1", -1); !domain.HasCode(err, domain.MessageTipCannotBeNegative) {
		t.Fatalf("a negative tip = %v", err)
	}
}

func TestOrderServiceAddAdjustment(t *testing.T) {
	tests := []struct {
		name  string
		input domain.OrderAdjustmentInput
		code  string
	}{
		{"a fixed discount on the order", domain.OrderAdjustmentInput{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 1200}, ""},
		{"a fixed discount of a line", domain.OrderAdjustmentInput{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 300, ItemID: new("i2")}, ""},
		{"more than the net left, less than with tax", domain.OrderAdjustmentInput{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 1201}, domain.MessageNegativeTotalNotAllowed},
		{"an order discount that names a line", domain.OrderAdjustmentInput{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 100, ItemID: new("i1")}, ""},
		{"more than the line is worth", domain.OrderAdjustmentInput{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 301, ItemID: new("i2")}, domain.MessageNegativeTotalNotAllowed},
		{"a percentage of a line", domain.OrderAdjustmentInput{Target: domain.AdjustmentItem, Type: domain.AdjustmentPercentage, Value: 100, ItemID: new("i1")}, ""},
		{"more than the order is worth", domain.OrderAdjustmentInput{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 1321}, domain.MessageNegativeTotalNotAllowed},
		{"a line discount without the line", domain.OrderAdjustmentInput{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 1}, domain.MessageItemIDRequiredForItemTarget},
		{"a line of another order", domain.OrderAdjustmentInput{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 1, ItemID: new("other")}, domain.CodeOrderItemNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newOrderFixture(sampleOpenOrder())
			err := f.service.AddAdjustment(context.Background(), "e1", "o1", tt.input)

			if tt.code != "" {
				if !domain.HasCode(err, tt.code) || len(f.orders.writes) != 0 {
					t.Fatalf("err = %v, writes = %v; want %s", err, f.orders.writes, tt.code)
				}
				return
			}

			updated, ok := f.events.events[0].(domain.OrderAdjustmentsUpdatedEvent)
			if err != nil || !ok || updated.OrderID != "o1" || len(updated.Adjustments) != 2 || f.orders.adjustment.Value != tt.input.Value {
				t.Fatalf("err = %v, events = %+v", err, f.events.events)
			}
			if tt.input.Target == domain.AdjustmentOrder && f.orders.adjustment.ItemID != nil {
				t.Fatalf("an order discount kept the line %s", *f.orders.adjustment.ItemID)
			}
		})
	}
}

func TestOrderServiceRemoveAdjustment(t *testing.T) {
	f := newOrderFixture(sampleOpenOrder())
	ctx := context.Background()

	if err := f.service.RemoveAdjustment(ctx, "e1", "o1", "missing"); !domain.HasCode(err, domain.MessageAdjustmentNotFound) {
		t.Fatalf("a discount that is not there = %v", err)
	}

	if err := f.service.RemoveAdjustment(ctx, "e1", "o1", "a1"); err != nil {
		t.Fatal(err)
	}
	updated, ok := f.events.events[0].(domain.OrderAdjustmentsUpdatedEvent)
	if !ok || updated.Adjustments == nil || len(updated.Adjustments) != 0 || f.orders.writes[0] != "RemoveAdjustment:a1" {
		t.Fatalf("events = %+v", f.events.events)
	}
}
