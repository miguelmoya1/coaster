package repository

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func insertOrderFixtures(t *testing.T) {
	t.Helper()

	statements := []string{
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar Pepe', now()), ('e2', 'Bar Juan', now())`,
		`INSERT INTO "Category" (id, "establishmentId", name) VALUES ('c1', 'e1', 'Bebidas'), ('c2', 'e2', 'Bebidas')`,
		`INSERT INTO "Product" (id, name, price, "categoryId", "taxRate", "updatedAt", "deletedAt") VALUES
			('beer', 'Beer', 500, 'c1', NULL, now(), NULL),
			('coke', 'Coke', 300, 'c1', 2100, now(), NULL),
			('gone', 'Gone', 100, 'c1', NULL, now(), now()),
			('theirs', 'Theirs', 100, 'c2', NULL, now(), NULL)`,
		`INSERT INTO "Table" (id, name, "establishmentId", "updatedAt") VALUES ('t1', 'Mesa 1', 'e1', now()), ('t2', 'Mesa 2', 'e1', now())`,
	}

	for _, statement := range statements {
		if _, err := testPool.Exec(context.Background(), statement); err != nil {
			t.Fatalf("inserting the fixtures: %v", err)
		}
	}
}

func tableStatusOf(t *testing.T, tableID string) domain.TableStatus {
	t.Helper()
	table, err := findTable(context.Background(), testPool, tableID)
	if err != nil || table == nil {
		t.Fatalf("reading table %s: %v", tableID, err)
	}
	return table.Status
}

func openTestOrder(t *testing.T, orders *OrderRepository, tableID *string, items ...domain.NewOrderItem) domain.OrderRow {
	t.Helper()

	total := 0
	for _, item := range items {
		total += item.Price * item.Quantity
	}

	order, err := orders.Create(context.Background(), domain.NewOrder{
		EstablishmentID: "e1", TableID: tableID, TotalAmount: total, Items: items,
	})
	if err != nil {
		t.Fatalf("opening an order: %v", err)
	}
	return order
}

func beerLine(quantity int) domain.NewOrderItem {
	return domain.NewOrderItem{ProductID: "beer", ProductName: "Beer", Quantity: quantity, Price: 500, TaxRate: 1000}
}

func cokeLine(quantity int) domain.NewOrderItem {
	return domain.NewOrderItem{ProductID: "coke", ProductName: "Coke", Quantity: quantity, Price: 300, TaxRate: 2100}
}

func TestTableRepository(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	tables := NewTableRepository(testPool)

	created, err := tables.Create(ctx, "e1", "Barra")
	if err != nil || created.Status != domain.TableFree || created.EstablishmentID != "e1" || created.CreatedAt.IsZero() {
		t.Fatalf("Create = %+v, %v", created, err)
	}

	listed, err := tables.ListOf(ctx, "e1")
	if err != nil || len(listed) != 3 || listed[0].Name != "Barra" || listed[2].Name != "Mesa 2" {
		t.Fatalf("ListOf = %+v, %v", listed, err)
	}

	renamed, err := tables.Rename(ctx, created.ID, "Barra 1")
	if err != nil || renamed.Name != "Barra 1" || !renamed.UpdatedAt.After(created.UpdatedAt.Add(-time.Millisecond)) {
		t.Fatalf("Rename = %+v, %v", renamed, err)
	}

	if err := setTableStatus(ctx, testPool, created.ID, domain.TableOccupied); err != nil || tableStatusOf(t, created.ID) != domain.TableOccupied {
		t.Fatalf("setTableStatus: %v", err)
	}

	if missing, err := tables.FindByID(ctx, "missing"); err != nil || missing != nil {
		t.Fatalf("FindByID(missing) = %+v, %v", missing, err)
	}

	orders := NewOrderRepository(testPool)
	order := openTestOrder(t, orders, &created.ID, beerLine(1))

	if err := tables.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := tables.FindByID(ctx, created.ID); gone != nil {
		t.Fatal("the table is still there")
	}

	after, err := orders.FindByID(ctx, order.ID)
	if err != nil || after.TableID != nil || after.TableName != nil {
		t.Fatalf("the order of a deleted table = %+v, %v", after, err)
	}

	if err := tables.Delete(ctx, created.ID); !errors.Is(err, errMissingRow) {
		t.Fatalf("deleting it twice = %v", err)
	}
}

func TestOrderRepositoryCreateAndRead(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)

	products, err := orders.FindProducts(ctx, "e1", []string{"beer", "coke", "gone", "theirs", "beer"})
	if err != nil || len(products) != 2 {
		t.Fatalf("FindProducts = %+v, %v", products, err)
	}
	for _, product := range products {
		if (product.ID == "beer" && product.TaxRate != 1000) || (product.ID == "coke" && product.TaxRate != 2100) {
			t.Errorf("the tax rate of %s is %d", product.ID, product.TaxRate)
		}
	}

	userNote := "sin hielo"
	reason := "cliente habitual"
	table := "t1"
	createdBy := "u1"
	if _, err := testPool.Exec(ctx, `INSERT INTO "User" (id, email, name, "updatedAt") VALUES ('u1', 'u1@example.com', 'Ana', now())`); err != nil {
		t.Fatal(err)
	}

	created, err := orders.Create(ctx, domain.NewOrder{
		EstablishmentID: "e1",
		CreatedByID:     &createdBy,
		TableID:         &table,
		TableName:       orderStringPtr("Mesa 1"),
		TotalAmount:     1300,
		Items:           []domain.NewOrderItem{beerLine(2), {ProductID: "coke", ProductName: "Coke", Quantity: 1, Price: 300, TaxRate: 2100, Notes: &userNote}},
		Adjustments:     []domain.NewOrderAdjustment{{Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 10, Reason: &reason}},
		TipAmount:       50,
		Notes:           orderStringPtr("para llevar"),
	})
	if err != nil {
		t.Fatal(err)
	}

	if created.Status != domain.OrderOpen || created.PaymentMethod != domain.PaymentNone || created.TotalAmount != 1300 ||
		created.TipAmount != 50 || *created.TableName != "Mesa 1" || *created.LinkedTableName != "Mesa 1" || *created.Notes != "para llevar" {
		t.Fatalf("created = %+v", created)
	}
	if len(created.Items) != 2 || len(created.Adjustments) != 1 || *created.Adjustments[0].Reason != reason ||
		created.Adjustments[0].Type != domain.AdjustmentPercentage {
		t.Fatalf("lines %+v, discounts %+v", created.Items, created.Adjustments)
	}
	for _, item := range created.Items {
		if item.PaymentStatus != domain.PaymentPending || item.DeliveryStatus != domain.DeliveryPending || item.PaymentMethod != domain.PaymentNone {
			t.Errorf("a new line = %+v", item)
		}
		if item.ProductID == "coke" && (item.ProductName != "Coke" || item.TaxRateAtPurchase != 2100 || *item.Notes != userNote) {
			t.Errorf("the coke line = %+v", item)
		}
	}
	if tableStatusOf(t, "t1") != domain.TableOccupied {
		t.Fatal("the table is not occupied")
	}

	var createdByID string
	if err := testPool.QueryRow(ctx, `SELECT "createdById" FROM "Order" WHERE id = $1`, created.ID).Scan(&createdByID); err != nil || createdByID != "u1" {
		t.Fatalf("createdById = %q, %v", createdByID, err)
	}

	later := openTestOrder(t, orders, nil, cokeLine(1))
	if _, err := testPool.Exec(ctx, `UPDATE "Order" SET status = 'CLOSED', "createdAt" = "createdAt" + interval '1 second' WHERE id = $1`, later.ID); err != nil {
		t.Fatal(err)
	}

	all, err := orders.ListOf(ctx, "e1", "")
	if err != nil || len(all) != 2 || all[0].ID != later.ID {
		t.Fatalf("ListOf = %+v, %v", all, err)
	}

	open, err := orders.ListOf(ctx, "e1", domain.OrderOpen)
	if err != nil || len(open) != 1 || open[0].ID != created.ID {
		t.Fatalf("ListOf(OPEN) = %+v, %v", open, err)
	}

	if _, err := orders.ListOf(ctx, "e1", "NOT_A_STATUS"); err == nil {
		t.Fatal("a status that does not exist must fail, as Prisma does")
	}

	day := created.CreatedAt.UTC().Truncate(24 * time.Hour)
	today, err := orders.ListCreatedBetween(ctx, "e1", day, day.AddDate(0, 0, 1))
	if err != nil || len(today) != 2 {
		t.Fatalf("ListCreatedBetween(today) = %+v, %v", today, err)
	}
	tomorrow, err := orders.ListCreatedBetween(ctx, "e1", day.AddDate(0, 0, 1), day.AddDate(0, 0, 2))
	if err != nil || len(tomorrow) != 0 {
		t.Fatalf("ListCreatedBetween(tomorrow) = %+v, %v", tomorrow, err)
	}

	byIDs, err := orders.FindByIDs(ctx, []string{later.ID, created.ID, "missing"})
	if err != nil || len(byIDs) != 2 || byIDs[0].ID != created.ID {
		t.Fatalf("FindByIDs = %+v, %v", byIDs, err)
	}

	if missing, err := orders.FindByID(ctx, "missing"); err != nil || missing != nil {
		t.Fatalf("FindByID(missing) = %+v, %v", missing, err)
	}
}

func TestOrderRepositoryAddItems(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)

	order := openTestOrder(t, orders, nil, beerLine(1))

	updated, err := orders.AddItems(ctx, order.ID, domain.OrderItemsAddition{Items: []domain.NewOrderItem{cokeLine(2)}, TotalAmount: 1100})
	if err != nil || len(updated.Items) != 2 || updated.TotalAmount != 1100 || updated.Notes != nil {
		t.Fatalf("AddItems = %+v, %v", updated, err)
	}

	note := "que tarde"
	updated, err = orders.AddItems(ctx, order.ID, domain.OrderItemsAddition{Items: []domain.NewOrderItem{cokeLine(1)}, TotalAmount: 1400, ChangeNotes: true, Notes: &note})
	if err != nil || *updated.Notes != note {
		t.Fatalf("AddItems with notes = %+v, %v", updated, err)
	}

	updated, err = orders.AddItems(ctx, order.ID, domain.OrderItemsAddition{Items: []domain.NewOrderItem{cokeLine(1)}, TotalAmount: 1700, ChangeNotes: true})
	if err != nil || updated.Notes != nil || len(updated.Items) != 4 {
		t.Fatalf("AddItems emptying the notes = %+v, %v", updated, err)
	}
}

func TestOrderRepositoryBulkUpdate(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)

	order := openTestOrder(t, orders, nil, beerLine(2))
	other := openTestOrder(t, orders, nil, beerLine(1))
	itemID := order.Items[0].ID
	card := domain.PaymentCard

	updated, err := orders.BulkUpdate(ctx, order.ID, []domain.OrderItemUpdate{
		{ItemID: itemID, PaidQuantity: orderIntPtr(1), PaymentMethod: &card, ServedQuantity: orderIntPtr(2)},
		{ItemID: other.Items[0].ID, ServedQuantity: orderIntPtr(1)},
	})
	if err != nil {
		t.Fatal(err)
	}

	item := updated.Items[0]
	if item.PaidQuantity != 1 || item.PaidQuantityCard != 1 || item.PaymentStatus != domain.PaymentPartial || item.PaymentMethod != domain.PaymentCard ||
		item.ServedQuantity != 2 || item.DeliveryStatus != domain.DeliveryServed {
		t.Fatalf("line = %+v", item)
	}
	if updated.AmountPaidCard != 550 || updated.AmountPaidCash != 0 || updated.PaymentMethod != domain.PaymentCard {
		t.Fatalf("order = %+v", updated)
	}

	untouched, _ := orders.FindByID(ctx, other.ID)
	if untouched.Items[0].ServedQuantity != 0 {
		t.Fatal("a line of another order was served")
	}

	updated, err = orders.BulkUpdate(ctx, order.ID, []domain.OrderItemUpdate{
		{ItemID: itemID, PaidQuantity: orderIntPtr(2)},
		{ItemID: itemID, PaidQuantity: orderIntPtr(0)},
	})
	if err != nil || updated.Items[0].PaidQuantity != 0 || updated.Items[0].PaymentStatus != domain.PaymentPending ||
		updated.AmountPaidCash != 0 || updated.AmountPaidCard != 0 || updated.PaymentMethod != domain.PaymentNone {
		t.Fatalf("paying and giving back = %+v, %v", updated, err)
	}

	if _, err := testPool.Exec(ctx, `UPDATE "Order" SET status = 'CLOSED' WHERE id = $1`, order.ID); err != nil {
		t.Fatal(err)
	}
	_, err = orders.BulkUpdate(ctx, order.ID, []domain.OrderItemUpdate{{ItemID: itemID, ServedQuantity: orderIntPtr(1)}})
	if !domain.HasCode(err, domain.CodeOrderNotOpen) {
		t.Fatalf("a closed order = %v", err)
	}
}

func TestOrderRepositoryCheckout(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)
	table := "t1"
	card := domain.PaymentCard

	order := openTestOrder(t, orders, &table, beerLine(2), cokeLine(1))
	beer := orderLineOf(t, order, "beer")
	if _, err := orders.BulkUpdate(ctx, order.ID, []domain.OrderItemUpdate{{ItemID: beer.ID, PaidQuantity: orderIntPtr(1), PaymentMethod: &card}}); err != nil {
		t.Fatal(err)
	}

	closed, err := orders.Checkout(ctx, order.ID, &table, domain.PaymentCash)
	if err != nil {
		t.Fatal(err)
	}

	if closed.Status != domain.OrderClosed || closed.TotalAmount != 1300 || closed.AmountPaidCard != 550 ||
		closed.AmountPaidCash != 913 || closed.PaymentMethod != domain.PaymentMixed {
		t.Fatalf("closed = %+v", closed)
	}
	for _, item := range closed.Items {
		if item.PaymentStatus != domain.PaymentPaid || item.PaidQuantity != item.Quantity {
			t.Errorf("line = %+v", item)
		}
	}
	if tableStatusOf(t, "t1") != domain.TableFree {
		t.Fatal("the table is still occupied")
	}

	if _, err := orders.Checkout(ctx, order.ID, &table, domain.PaymentCash); !domain.HasCode(err, domain.CodeOrderNotOpen) {
		t.Fatalf("closing it again = %v", err)
	}
}

func TestOrderRepositoryCheckoutTakesTheMoneyOnce(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)

	order := openTestOrder(t, orders, nil, domain.NewOrderItem{ProductID: "beer", ProductName: "Beer", Quantity: 1, Price: 1000, TaxRate: 1000})

	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := range errs {
		wg.Go(func() {
			_, errs[i] = orders.Checkout(ctx, order.ID, nil, domain.PaymentCash)
		})
	}
	wg.Wait()

	succeeded, refused := 0, 0
	for _, err := range errs {
		switch {
		case err == nil:
			succeeded++
		case domain.HasCode(err, domain.CodeOrderNotOpen):
			refused++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if succeeded != 1 || refused != 1 {
		t.Fatalf("%d checkouts went through and %d were refused", succeeded, refused)
	}

	closed, _ := orders.FindByID(ctx, order.ID)
	if closed.AmountPaidCash != 1100 {
		t.Fatalf("took %d in cash, want 1100", closed.AmountPaidCash)
	}
}

func TestOrderRepositoryMerge(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)
	t1, t2 := "t1", "t2"

	first := openTestOrder(t, orders, &t1, beerLine(2))
	second := openTestOrder(t, orders, &t2, cokeLine(1))
	statements := []struct {
		sql string
		id  string
	}{
		{`UPDATE "Order" SET "amountPaidCash" = 400, "tipAmount" = 50 WHERE id = $1`, first.ID},
		{`UPDATE "Order" SET "amountPaidCard" = 200, "tipAmount" = 25 WHERE id = $1`, second.ID},
	}
	for _, statement := range statements {
		if _, err := testPool.Exec(ctx, statement.sql, statement.id); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := orders.AddAdjustment(ctx, first.ID, domain.NewOrderAdjustment{Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 10}); err != nil {
		t.Fatal(err)
	}
	if _, err := orders.AddAdjustment(ctx, second.ID, domain.NewOrderAdjustment{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 30}); err != nil {
		t.Fatal(err)
	}

	merged, err := orders.Merge(ctx, domain.OrderMerge{
		PrimaryID:        first.ID,
		PrimaryTableID:   &t1,
		PrimaryTableName: orderStringPtr("Mesa 1"),
		Sources:          []domain.MergedOrder{{ID: second.ID, TableID: &t2}},
		TargetTableID:    &t2,
	})
	if err != nil {
		t.Fatal(err)
	}

	if merged.Status != domain.OrderOpen || len(merged.Items) != 2 || merged.TotalAmount != 1300 || merged.AmountPaidCash != 400 ||
		merged.AmountPaidCard != 200 || merged.TipAmount != 75 || merged.PaymentMethod != domain.PaymentMixed ||
		*merged.TableID != "t2" || *merged.TableName != "Mesa 2" {
		t.Fatalf("merged = %+v", merged)
	}

	if len(merged.Adjustments) != 2 {
		t.Fatalf("discounts = %+v", merged.Adjustments)
	}
	for _, adjustment := range merged.Adjustments {
		if adjustment.Type != domain.AdjustmentFixedAmount || (adjustment.Value != 100 && adjustment.Value != 30) {
			t.Errorf("discount = %+v; the 10 %% of 1000 has to be frozen at 100", adjustment)
		}
	}

	source, _ := orders.FindByID(ctx, second.ID)
	if source.Status != domain.OrderCancelled || source.AmountPaidCard != 0 || source.TipAmount != 0 || len(source.Items) != 0 {
		t.Fatalf("source = %+v", source)
	}
	if tableStatusOf(t, "t1") != domain.TableFree || tableStatusOf(t, "t2") != domain.TableOccupied {
		t.Fatal("the tables did not follow the order")
	}
}

func TestOrderRepositoryMoveCancelAndRemove(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)
	t1 := "t1"

	order := openTestOrder(t, orders, &t1, beerLine(2), cokeLine(1))

	moved, err := orders.MoveTable(ctx, order.ID, &t1, "t2", "Mesa 2")
	if err != nil || *moved.TableID != "t2" || *moved.TableName != "Mesa 2" {
		t.Fatalf("MoveTable = %+v, %v", moved, err)
	}
	if tableStatusOf(t, "t1") != domain.TableFree || tableStatusOf(t, "t2") != domain.TableOccupied {
		t.Fatal("the tables did not follow the order")
	}

	cokeID := orderLineOf(t, moved, "coke").ID
	if _, err := orders.AddAdjustment(ctx, order.ID, domain.NewOrderAdjustment{Target: domain.AdjustmentItem, Type: domain.AdjustmentFixedAmount, Value: 50, ItemID: &cokeID}); err != nil {
		t.Fatal(err)
	}

	removed, err := orders.RemoveItem(ctx, order.ID, cokeID)
	if err != nil || len(removed.Items) != 1 || removed.TotalAmount != 1000 || len(removed.Adjustments) != 0 {
		t.Fatalf("RemoveItem = %+v, %v; the line's discount goes with it", removed, err)
	}

	two := "t2"
	cancelled, err := orders.RemoveLastItemAndCancel(ctx, order.ID, removed.Items[0].ID, &two)
	if err != nil || cancelled.Status != domain.OrderCancelled || cancelled.TotalAmount != 0 || len(cancelled.Items) != 0 {
		t.Fatalf("RemoveLastItemAndCancel = %+v, %v", cancelled, err)
	}
	if tableStatusOf(t, "t2") != domain.TableFree {
		t.Fatal("the table is still occupied")
	}

	if _, err := orders.RemoveItem(ctx, order.ID, "missing"); !errors.Is(err, errMissingRow) {
		t.Fatalf("removing a line that is not there = %v", err)
	}

	another := openTestOrder(t, orders, &t1, beerLine(1))
	cancelled, err = orders.Cancel(ctx, another.ID, &t1)
	if err != nil || cancelled.Status != domain.OrderCancelled || len(cancelled.Items) != 1 || tableStatusOf(t, "t1") != domain.TableFree {
		t.Fatalf("Cancel = %+v, %v", cancelled, err)
	}
}

func TestOrderRepositoryCancelAndMoveOnlyAnOpenOrder(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)
	t1 := "t1"

	order := openTestOrder(t, orders, &t1, beerLine(1))
	if _, err := orders.Checkout(ctx, order.ID, &t1, domain.PaymentCash); err != nil {
		t.Fatal(err)
	}

	if _, err := orders.Cancel(ctx, order.ID, &t1); !domain.HasCode(err, domain.CodeOrderNotOpen) {
		t.Fatalf("cancelling a closed order = %v", err)
	}
	if _, err := orders.MoveTable(ctx, order.ID, &t1, "t2", "Mesa 2"); !domain.HasCode(err, domain.CodeOrderNotOpen) {
		t.Fatalf("moving a closed order = %v", err)
	}
	if _, err := orders.RemoveLastItemAndCancel(ctx, order.ID, order.Items[0].ID, &t1); !domain.HasCode(err, domain.CodeOrderNotOpen) {
		t.Fatalf("removing the last line of a closed order = %v", err)
	}

	closed, err := orders.FindByID(ctx, order.ID)
	if err != nil || closed.Status != domain.OrderClosed || *closed.TableID != "t1" || len(closed.Items) != 1 {
		t.Fatalf("the closed order changed: %+v, %v", closed, err)
	}
	if tableStatusOf(t, "t2") != domain.TableFree {
		t.Fatal("moving a closed order took t2")
	}

	racing := openTestOrder(t, orders, nil, beerLine(1))
	var wg sync.WaitGroup
	var cancelErr, checkoutErr error
	wg.Go(func() {
		_, cancelErr = orders.Cancel(ctx, racing.ID, nil)
	})
	wg.Go(func() {
		_, checkoutErr = orders.Checkout(ctx, racing.ID, nil, domain.PaymentCash)
	})
	wg.Wait()

	if (cancelErr == nil) == (checkoutErr == nil) {
		t.Fatalf("cancel = %v, checkout = %v; want exactly one to go through", cancelErr, checkoutErr)
	}
	for _, err := range []error{cancelErr, checkoutErr} {
		if err != nil && !domain.HasCode(err, domain.CodeOrderNotOpen) {
			t.Fatalf("unexpected error: %v", err)
		}
	}
}

func TestOrderRepositoryNotesTipDiscountsAndDelete(t *testing.T) {
	resetDB(t)
	insertOrderFixtures(t)
	ctx := context.Background()
	orders := NewOrderRepository(testPool)

	order := openTestOrder(t, orders, nil, beerLine(1))

	updated, err := orders.UpdateNotes(ctx, order.ID, domain.OrderNotesChanges{ChangeNotes: true, Notes: orderStringPtr("sin sal"), ChangeTicketNotes: true, TicketNotes: orderStringPtr("gracias")})
	if err != nil || *updated.Notes != "sin sal" || *updated.TicketNotes != "gracias" {
		t.Fatalf("UpdateNotes = %+v, %v", updated, err)
	}

	updated, err = orders.UpdateNotes(ctx, order.ID, domain.OrderNotesChanges{ChangeTicketNotes: true})
	if err != nil || *updated.Notes != "sin sal" || updated.TicketNotes != nil {
		t.Fatalf("UpdateNotes of the ticket only = %+v, %v", updated, err)
	}

	unchanged, err := orders.UpdateNotes(ctx, order.ID, domain.OrderNotesChanges{})
	if err != nil || !unchanged.UpdatedAt.Equal(updated.UpdatedAt) {
		t.Fatalf("UpdateNotes without changes touched the order: %v → %v, %v", updated.UpdatedAt, unchanged.UpdatedAt, err)
	}

	itemID := order.Items[0].ID
	updated, err = orders.UpdateItemNotes(ctx, order.ID, itemID, orderStringPtr("bien fría"))
	if err != nil || *updated.Items[0].Notes != "bien fría" {
		t.Fatalf("UpdateItemNotes = %+v, %v", updated, err)
	}
	if _, err := orders.UpdateItemNotes(ctx, "another", itemID, nil); !errors.Is(err, errMissingRow) {
		t.Fatalf("the note of a line of another order = %v", err)
	}

	if err := orders.UpdateTip(ctx, order.ID, 120); err != nil {
		t.Fatal(err)
	}

	withDiscount, err := orders.AddAdjustment(ctx, order.ID, domain.NewOrderAdjustment{Target: domain.AdjustmentOrder, Type: domain.AdjustmentFixedAmount, Value: 20, Reason: orderStringPtr("amigo")})
	if err != nil || withDiscount.TipAmount != 120 || len(withDiscount.Adjustments) != 1 || withDiscount.Adjustments[0].Value != 20 {
		t.Fatalf("AddAdjustment = %+v, %v", withDiscount, err)
	}

	withoutDiscount, err := orders.RemoveAdjustment(ctx, order.ID, withDiscount.Adjustments[0].ID)
	if err != nil || len(withoutDiscount.Adjustments) != 0 {
		t.Fatalf("RemoveAdjustment = %+v, %v", withoutDiscount, err)
	}

	if err := orders.Delete(ctx, order.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := orders.FindByID(ctx, order.ID); gone != nil {
		t.Fatal("the order is still there")
	}
	if err := orders.Delete(ctx, order.ID); !errors.Is(err, errMissingRow) {
		t.Fatalf("deleting it twice = %v", err)
	}
}

func orderLineOf(t *testing.T, order domain.OrderRow, productID string) domain.OrderItemRow {
	t.Helper()
	for _, item := range order.Items {
		if item.ProductID == productID {
			return item
		}
	}
	t.Fatalf("the order has no line of %s", productID)
	return domain.OrderItemRow{}
}

func orderStringPtr(value string) *string {
	return &value
}

func orderIntPtr(value int) *int {
	return &value
}
