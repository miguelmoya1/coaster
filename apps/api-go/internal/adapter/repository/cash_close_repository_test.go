package repository

import (
	"context"
	"encoding/json"
	"slices"
	"sync"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// Rows the cash close and stats tests start from, written straight with SQL.

// seedTill creates Ana and Luis, the establishments e1 and e2, and a product in each.
func seedTill(t *testing.T) {
	t.Helper()
	resetDB(t)

	for _, statement := range []string{
		`INSERT INTO "User" (id, email, name, "updatedAt") VALUES ('ana', 'ana@example.com', 'Ana', now()), ('luis', 'luis@example.com', 'Luis', now())`,
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar Pepe', now()), ('e2', 'Otro', now())`,
		`INSERT INTO "Category" (id, "establishmentId", name) VALUES ('c1', 'e1', 'Drinks'), ('c2', 'e2', 'Theirs')`,
		`INSERT INTO "Product" (id, name, "categoryId", "updatedAt") VALUES ('p1', 'Beer', 'c1', now()), ('p2', 'Wine', 'c2', now())`,
	} {
		if _, err := testPool.Exec(context.Background(), statement); err != nil {
			t.Fatalf("seeding: %v", err)
		}
	}
}

// tillOrder is an order as the tests write it.
type tillOrder struct {
	id, establishmentID string
	status              domain.OrderStatus
	cash, card, tip     int
	createdAt           time.Time
	cashCloseID         *string
}

func insertTillOrder(t *testing.T, order tillOrder) {
	t.Helper()
	if order.createdAt.IsZero() {
		order.createdAt = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	}

	_, err := testPool.Exec(context.Background(), `
		INSERT INTO "Order" (id, "establishmentId", status, "amountPaidCash", "amountPaidCard", "tipAmount", "cashCloseId", "createdAt", "updatedAt")
		VALUES ($1, $2, $3::text::"OrderStatus", $4, $5, $6, $7, $8, $8)`,
		order.id, order.establishmentID, string(order.status), order.cash, order.card, order.tip, order.cashCloseID, order.createdAt)
	if err != nil {
		t.Fatalf("inserting order %s: %v", order.id, err)
	}
}

func insertTillItem(t *testing.T, orderID string, item domain.PricingItem) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "priceAtPurchase", "productNameAtPurchase", "taxRateAtPurchase", "paidQuantity", "updatedAt")
		VALUES ($1, $2, 'p1', $3, $4, 'Beer', $5, $6, now())`,
		item.ID, orderID, item.Quantity, item.PriceAtPurchase, item.TaxRate, item.PaidQuantity)
	if err != nil {
		t.Fatalf("inserting item %s: %v", item.ID, err)
	}
}

func insertTillAdjustment(t *testing.T, orderID string, adjustment domain.PricingAdjustment) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		INSERT INTO "OrderAdjustment" (id, "orderId", target, type, value, "itemId")
		VALUES ($1, $2, $3::text::"AdjustmentTarget", $4::text::"AdjustmentType", $5, $6)`,
		adjustment.ID, orderID, string(adjustment.Target), string(adjustment.Type), adjustment.Value, adjustment.ItemID)
	if err != nil {
		t.Fatalf("inserting adjustment %s: %v", adjustment.ID, err)
	}
}

func insertTillClose(t *testing.T, id, establishmentID, closedByID string, closedAt time.Time, openingFloat int) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		INSERT INTO "CashClose" (id, "establishmentId", "closedById", "closedAt", "closedOrders", "cancelledOrders", "cancelledAmount",
			"cashAmount", "cardAmount", "tipAmount", "openingFloat", "countedCash")
		VALUES ($1, $2, $3, $4, 1, 0, 0, 9999, 0, 0, $5, 9999)`,
		id, establishmentID, closedByID, closedAt, openingFloat)
	if err != nil {
		t.Fatalf("inserting close %s: %v", id, err)
	}
}

// seedTillDay writes a day of e1 that a close has not counted yet, orders a close already
// counted, and orders of e2. The lines and discounts of A, B and E are those of
// cashCloseFixtures in the domain tests, whose totals come from Nest.
func seedTillDay(t *testing.T) {
	t.Helper()
	seedTill(t)

	insertTillClose(t, "older-close", "e1", "luis", time.Date(2026, 9, 10, 23, 0, 0, 0, time.UTC), 10000)
	insertTillClose(t, "old-close", "e1", "luis", time.Date(2026, 9, 20, 23, 0, 0, 0, time.UTC), 15000)
	insertTillClose(t, "their-close", "e2", "ana", time.Date(2026, 9, 25, 23, 0, 0, 0, time.UTC), 50000)

	insertTillOrder(t, tillOrder{id: "A", establishmentID: "e1", status: domain.OrderClosed, cash: 3000, card: 1000, tip: 200})
	insertTillItem(t, "A", domain.PricingItem{ID: "A1", PriceAtPurchase: 1000, Quantity: 2, PaidQuantity: 2, TaxRate: 1000})
	insertTillItem(t, "A", domain.PricingItem{ID: "A2", PriceAtPurchase: 1500, Quantity: 1, PaidQuantity: 1, TaxRate: 2100})
	insertTillAdjustment(t, "A", domain.PricingAdjustment{ID: "a1", Target: domain.AdjustmentItem, Type: domain.AdjustmentPercentage, Value: 10, ItemID: new("A2")})
	insertTillAdjustment(t, "A", domain.PricingAdjustment{ID: "a2", Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 300})

	insertTillOrder(t, tillOrder{id: "B", establishmentID: "e1", status: domain.OrderCancelled, cash: 500, tip: 150})
	insertTillItem(t, "B", domain.PricingItem{ID: "B1", PriceAtPurchase: 1000, Quantity: 2, TaxRate: 1000})
	insertTillItem(t, "B", domain.PricingItem{ID: "B2", PriceAtPurchase: 1500, Quantity: 1, TaxRate: 2100})
	insertTillAdjustment(t, "B", domain.PricingAdjustment{ID: "b1", Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 250, ItemID: new("B1")})
	insertTillAdjustment(t, "B", domain.PricingAdjustment{ID: "b2", Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 15})

	insertTillOrder(t, tillOrder{id: "C", establishmentID: "e1", status: domain.OrderCancelled, card: 700})

	insertTillOrder(t, tillOrder{id: "E", establishmentID: "e1", status: domain.OrderCancelled})
	insertTillItem(t, "E", domain.PricingItem{ID: "E1", PriceAtPurchase: 333, Quantity: 3, TaxRate: 2100})
	insertTillItem(t, "E", domain.PricingItem{ID: "E2", PriceAtPurchase: 199, Quantity: 1, TaxRate: 1000})
	insertTillAdjustment(t, "E", domain.PricingAdjustment{ID: "e3", Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 5000, ItemID: new("E2")})
	insertTillAdjustment(t, "E", domain.PricingAdjustment{ID: "e4", Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 33})

	insertTillOrder(t, tillOrder{id: "tab", establishmentID: "e1", status: domain.OrderOpen, cash: 500, tip: 100})
	insertTillItem(t, "tab", domain.PricingItem{ID: "tab1", PriceAtPurchase: 1000, Quantity: 2, PaidQuantity: 1, TaxRate: 1000})
	insertTillOrder(t, tillOrder{id: "table-3", establishmentID: "e1", status: domain.OrderOpen, card: 250})
	insertTillOrder(t, tillOrder{id: "untouched", establishmentID: "e1", status: domain.OrderOpen})

	insertTillOrder(t, tillOrder{id: "counted", establishmentID: "e1", status: domain.OrderClosed, cash: 9999, cashCloseID: new("old-close")})
	insertTillOrder(t, tillOrder{id: "theirs", establishmentID: "e2", status: domain.OrderClosed, cash: 12345})
	insertTillOrder(t, tillOrder{id: "their-tab", establishmentID: "e2", status: domain.OrderOpen, cash: 777})
}

// tillDayTotals is what a close of seedTillDay counts: A closed, B and E cancelled with lines
// (3136 + 731, as in Nest), C cancelled without lines but with 700 charged by card.
var tillDayTotals = domain.CashCloseTotals{
	ClosedOrders: 1, CancelledOrders: 2, CancelledAmount: 3867, CashAmount: 3500, CardAmount: 1700, TipAmount: 200,
}

func cashCloseIDOf(t *testing.T, orderID string) *string {
	t.Helper()
	var id *string
	if err := testPool.QueryRow(context.Background(), `SELECT "cashCloseId" FROM "Order" WHERE id = $1`, orderID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func TestCashCloseRepositoryReadsWhatTheCloseWouldCount(t *testing.T) {
	seedTillDay(t)
	ctx := context.Background()
	closes := NewCashCloseRepository(testPool)

	till, err := closes.FindTill(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	last, orders, charges := till.Last, till.UnclosedOrders, till.OpenOrdersCharges
	if last == nil || !last.ClosedAt.Equal(time.Date(2026, 9, 20, 23, 0, 0, 0, time.UTC)) || last.OpeningFloat != 15000 {
		t.Fatalf("FindLast = %+v, want old-close", last)
	}

	if len(orders) != 4 {
		t.Fatalf("FindUnclosedOrders = %d orders, want A, B, C and E", len(orders))
	}
	if got := domain.CashCloseTotalsOf(orders); got != tillDayTotals {
		t.Errorf("totals = %+v, want %+v", got, tillDayTotals)
	}

	for _, order := range orders {
		if order.Status == domain.OrderClosed && (len(order.Items) != 2 || len(order.Adjustments) != 2) {
			t.Errorf("A read with %d lines and %d discounts, want 2 and 2", len(order.Items), len(order.Adjustments))
		}
		for _, adjustment := range order.Adjustments {
			if adjustment.Target == domain.AdjustmentItem && adjustment.ItemID == nil {
				t.Errorf("discount %s lost its line", adjustment.ID)
			}
			if adjustment.Target == domain.AdjustmentOrder && adjustment.ItemID != nil {
				t.Errorf("discount %s has line %s", adjustment.ID, *adjustment.ItemID)
			}
		}
	}

	charged := 0
	for _, charge := range charges {
		charged += charge.AmountPaidCash + charge.AmountPaidCard
	}
	if len(charges) != 3 || charged != 750 {
		t.Errorf("FindOpenOrdersCharges = %+v, want 3 open orders with 750 charged", charges)
	}
}

func TestCashCloseRepositoryWithNothingToCount(t *testing.T) {
	seedTill(t)
	ctx := context.Background()
	closes := NewCashCloseRepository(testPool)

	if till, err := closes.FindTill(ctx, "e1"); err != nil || till.Last != nil || len(till.UnclosedOrders) != 0 || len(till.OpenOrdersCharges) != 0 {
		t.Fatalf("FindTill = %+v, %v; want nothing", till, err)
	}
	if _, err := closes.Close(ctx, domain.NewCashClose{EstablishmentID: "missing", ClosedByID: "ana"}); !domain.HasCode(err, domain.CodeEstablishmentNotFound) {
		t.Fatalf("closing the till of an establishment that does not exist = %v", err)
	}
	if recent, err := closes.ListRecent(ctx, "e1"); err != nil || len(recent) != 0 {
		t.Fatalf("ListRecent = %+v, %v; want none", recent, err)
	}

	closed, err := closes.Close(ctx, domain.NewCashClose{EstablishmentID: "e1", ClosedByID: "ana"})
	if err != nil {
		t.Fatal(err)
	}
	if closed.Since != nil || closed.CashCloseTotals != (domain.CashCloseTotals{}) || closed.Notes != nil {
		t.Errorf("first close = %+v, want it to start from the beginning with nothing", closed)
	}
}

func TestCashCloseRepositoryClose(t *testing.T) {
	seedTillDay(t)
	ctx := context.Background()
	closes := NewCashCloseRepository(testPool)
	notes := "Sin incidencias"
	before := time.Now().Add(-time.Second)

	closed, err := closes.Close(ctx, domain.NewCashClose{
		EstablishmentID: "e1", ClosedByID: "ana", OpeningFloat: 20000, CountedCash: 23000, Notes: &notes,
	})
	if err != nil {
		t.Fatal(err)
	}

	if closed.ID == "" || closed.EstablishmentID != "e1" || closed.ClosedByID != "ana" || closed.ClosedByName != "Ana" {
		t.Errorf("close = %+v", closed)
	}
	if closed.Since == nil || !closed.Since.Equal(time.Date(2026, 9, 20, 23, 0, 0, 0, time.UTC)) {
		t.Errorf("since = %v, want where old-close ended", closed.Since)
	}
	if closed.ClosedAt.Before(before) || closed.ClosedAt.After(time.Now().Add(time.Second)) {
		t.Errorf("closedAt = %s, want now", closed.ClosedAt)
	}
	if closed.CashCloseTotals != tillDayTotals {
		t.Errorf("totals = %+v, want %+v", closed.CashCloseTotals, tillDayTotals)
	}
	if closed.OpeningFloat != 20000 || closed.CountedCash != 23000 || closed.Notes == nil || *closed.Notes != notes {
		t.Errorf("count = %+v", closed)
	}

	for _, orderID := range []string{"A", "B", "C", "E"} {
		if id := cashCloseIDOf(t, orderID); id == nil || *id != closed.ID {
			t.Errorf("order %s is in close %v, want %s", orderID, id, closed.ID)
		}
	}
	for _, orderID := range []string{"tab", "table-3", "untouched", "theirs", "their-tab"} {
		if id := cashCloseIDOf(t, orderID); id != nil {
			t.Errorf("order %s went into close %s", orderID, *id)
		}
	}
	if id := cashCloseIDOf(t, "counted"); id == nil || *id != "old-close" {
		t.Errorf("order counted moved to close %v", id)
	}

	var updatedAt time.Time
	if err := testPool.QueryRow(ctx, `SELECT "updatedAt" FROM "Order" WHERE id = 'A'`).Scan(&updatedAt); err != nil {
		t.Fatal(err)
	}
	if updatedAt.Before(before) {
		t.Errorf("order A updatedAt = %s, want it touched by the close", updatedAt)
	}

	till, err := closes.FindTill(ctx, "e1")
	if err != nil || len(till.UnclosedOrders) != 0 {
		t.Errorf("after the close FindTill = %d orders, %v; want none", len(till.UnclosedOrders), err)
	}
	last := till.Last
	if last == nil || !last.ClosedAt.Equal(closed.ClosedAt.Time) || last.OpeningFloat != 20000 {
		t.Errorf("after the close the last close = %+v", last)
	}

	next, err := closes.Close(ctx, domain.NewCashClose{EstablishmentID: "e1", ClosedByID: "luis", CountedCash: 100})
	if err != nil {
		t.Fatal(err)
	}
	if next.Since == nil || !next.Since.Equal(closed.ClosedAt.Time) || next.CashCloseTotals != (domain.CashCloseTotals{}) || next.ClosedByName != "Luis" {
		t.Errorf("next close = %+v, want it empty and starting where the first ended", next)
	}

	recent, err := closes.ListRecent(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	var ids []string
	for _, c := range recent {
		ids = append(ids, c.ID)
	}
	want := []string{next.ID, closed.ID, "old-close", "older-close"}
	if len(ids) != len(want) {
		t.Fatalf("ListRecent = %v, want %v", ids, want)
	}
	for i := range want {
		if ids[i] != want[i] {
			t.Fatalf("ListRecent = %v, want %v", ids, want)
		}
	}
	listed, _ := json.Marshal(recent[1])
	returned, _ := json.Marshal(closed)
	if string(listed) != string(returned) {
		t.Errorf("listed close = %s\nwant %s", listed, returned)
	}
	if recent[2].ClosedByName != "Luis" || recent[2].Since != nil || recent[2].CashAmount != 9999 {
		t.Errorf("old-close = %+v", recent[2])
	}
}

func TestCashCloseRepositoryListsTheLast60(t *testing.T) {
	seedTill(t)
	ctx := context.Background()

	start := time.Date(2026, 1, 1, 23, 0, 0, 0, time.UTC)
	for day := range 61 {
		insertTillClose(t, "close-"+start.AddDate(0, 0, day).Format("2006-01-02"), "e1", "ana", start.AddDate(0, 0, day), 0)
	}

	recent, err := NewCashCloseRepository(testPool).ListRecent(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	if len(recent) != 60 || recent[0].ID != "close-2026-03-02" || recent[59].ID != "close-2026-01-02" {
		t.Errorf("ListRecent = %d closes from %s to %s", len(recent), recent[0].ID, recent[len(recent)-1].ID)
	}
}

func TestCashCloseRepositoryClosesOneAtATime(t *testing.T) {
	seedTillDay(t)
	ctx := context.Background()
	closes := NewCashCloseRepository(testPool)

	var wg sync.WaitGroup
	results := make([]domain.CashClose, 2)
	errs := make([]error, 2)
	for i := range 2 {
		wg.Go(func() {
			results[i], errs[i] = closes.Close(ctx, domain.NewCashClose{EstablishmentID: "e1", ClosedByID: "ana"})
		})
	}
	wg.Wait()

	if errs[0] != nil || errs[1] != nil {
		t.Fatal(errs)
	}

	first, second := results[0], results[1]
	if first.ClosedOrders == 0 {
		first, second = second, first
	}
	if first.CashCloseTotals != tillDayTotals || second.CashCloseTotals != (domain.CashCloseTotals{}) {
		t.Errorf("totals = %+v and %+v, want the day counted once", first.CashCloseTotals, second.CashCloseTotals)
	}
	if second.Since == nil || !second.Since.Equal(first.ClosedAt.Time) {
		t.Errorf("the second close starts at %v, want %s", second.Since, first.ClosedAt)
	}
}

func TestCashCloseRepositoryListsClosesOfTheSameInstantByID(t *testing.T) {
	seedTill(t)
	at := time.Date(2026, 9, 20, 23, 0, 0, 0, time.UTC)
	insertTillClose(t, "close-a", "e1", "ana", at, 0)
	insertTillClose(t, "close-c", "e1", "ana", at, 0)
	insertTillClose(t, "close-b", "e1", "ana", at, 0)

	recent, err := NewCashCloseRepository(testPool).ListRecent(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	var ids []string
	for _, c := range recent {
		ids = append(ids, c.ID)
	}
	if want := []string{"close-c", "close-b", "close-a"}; !slices.Equal(ids, want) {
		t.Errorf("ListRecent = %v, want %v", ids, want)
	}
}
