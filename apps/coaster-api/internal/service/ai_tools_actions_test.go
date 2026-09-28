package service

import (
	"slices"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

const aiDone = `{"status":"ok","message":"Action completed successfully."}`

func TestAITableActions(t *testing.T) {
	f := newAIFixture()
	owner := f.toolContext(t, "u1")

	if got := f.run(t, owner, "createTable", `{"name":"Mesa 4"}`); got != aiDone {
		t.Errorf("createTable = %s", got)
	}
	if f.tables.tables["table-new"].Name != "Mesa 4" {
		t.Error("the table was not created")
	}

	if got := f.run(t, owner, "updateTable", `{"tableId":"t2","name":"Terraza 1"}`); got != aiDone || f.tables.tables["t2"].Name != "Terraza 1" {
		t.Errorf("updateTable = %s, the table is %+v", got, f.tables.tables["t2"])
	}

	if got := f.run(t, owner, "deleteTable", `{"tableId":"t2","confirmed":true}`); got != aiDone || !slices.Contains(f.tables.deleted, "t2") {
		t.Errorf("deleteTable = %s, deleted %v", got, f.tables.deleted)
	}

	want := `{"status":"error","message":"The action failed: TABLE_NOT_FOUND","errorKey":"TABLE_NOT_FOUND"}`
	if got := f.run(t, owner, "updateTable", `{"tableId":"t9","name":"Otra"}`); got != want {
		t.Errorf("updateTable of an unknown table = %s", got)
	}
}

func TestAIOrderActions(t *testing.T) {
	t.Run("createOrder refuses a product that is not on the menu", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u2"), "createOrder",
			`{"tableId":"t2","items":[{"productId":"p1","quantity":2},{"productId":"p9","quantity":1}]}`)

		want := `{"status":"error","message":"These products are not in this establishment's menu: p9. Nothing was added: use the exact product UUIDs from the menu."}`
		if got != want || len(f.orders.writes) != 0 {
			t.Fatalf("createOrder = %s, writes %v", got, f.orders.writes)
		}
	})

	t.Run("createOrder records who opened it", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u2"), "createOrder", `{"tableId":"t2","items":[{"productId":"p1","quantity":2}]}`)

		created := f.orders.created
		if got != aiDone || created.CreatedByID == nil || *created.CreatedByID != "u2" || created.TableID == nil || *created.TableID != "t2" {
			t.Fatalf("createOrder = %s, created %+v", got, created)
		}
		if len(created.Items) != 1 || created.Items[0].ProductID != "p1" || created.Items[0].Quantity != 2 {
			t.Errorf("lines = %+v, want two p1", created.Items)
		}
	})

	t.Run("createOrder without a table", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u1"), "createOrder", `{"tableId":"","items":[{"productId":"p2","quantity":1}]}`)
		if got != aiDone || f.orders.created.TableID != nil {
			t.Errorf("createOrder = %s, table %v", got, f.orders.created.TableID)
		}
	})

	tests := []struct {
		name, tool, input string
		check             func(f *aiFixture) bool
	}{
		{"addOrderItems", "addOrderItems", `{"orderId":"o2","items":[{"productId":"p2","quantity":3}]}`,
			func(f *aiFixture) bool {
				items := f.orders.addition.Items
				return len(items) == 1 && items[0].ProductID == "p2" && items[0].Quantity == 3 && !f.orders.addition.ChangeNotes
			}},
		{"checkoutOrder", "checkoutOrder", `{"orderId":"o1","paymentMethod":"CARD"}`,
			func(f *aiFixture) bool { return f.orders.method == domain.PaymentCard }},
		{"serveOrPayItems", "serveOrPayItems", `{"orderId":"o1","items":[{"itemId":"i1","servedQuantity":3,"paymentMethod":"CASH"},{"itemId":"i2","paidQuantity":1}]}`,
			func(f *aiFixture) bool {
				updates := f.orders.updates
				return len(updates) == 2 && *updates[0].ServedQuantity == 3 && updates[0].PaidQuantity == nil &&
					*updates[0].PaymentMethod == domain.PaymentCash && *updates[1].PaidQuantity == 1 && updates[1].PaymentMethod == nil
			}},
		{"moveOrderTable", "moveOrderTable", `{"orderId":"o2","tableId":"t2"}`,
			func(f *aiFixture) bool { return slices.Contains(f.orders.writes, "MoveTable:t2:Terraza") }},
		{"mergeOrders", "mergeOrders", `{"orderIds":["o1","o2"],"targetTableId":""}`,
			func(f *aiFixture) bool {
				return f.orders.merge.TargetTableID == nil && len(f.orders.merge.Sources) == 1
			}},
		{"updateOrderTip in euros", "updateOrderTip", `{"orderId":"o1","tip":2.5}`,
			func(f *aiFixture) bool { return f.orders.tip == 250 }},
		{"applyOrderDiscount of a percentage", "applyOrderDiscount", `{"orderId":"o1","target":"ORDER","type":"PERCENTAGE","value":12.5}`,
			func(f *aiFixture) bool {
				a := f.orders.adjustment
				return a.Value == 13 && a.Type == domain.AdjustmentPercentage && a.ItemID == nil && a.Reason == nil
			}},
		{"applyOrderDiscount of an amount in euros", "applyOrderDiscount", `{"orderId":"o1","target":"ITEM","itemId":"i1","type":"FIXED_AMOUNT","value":0.5,"reason":"queja"}`,
			func(f *aiFixture) bool {
				a := f.orders.adjustment
				return a.Value == 50 && a.Target == domain.AdjustmentItem && *a.ItemID == "i1" && *a.Reason == "queja"
			}},
		{"removeOrderDiscount", "removeOrderDiscount", `{"orderId":"o1","adjustmentId":"a2"}`,
			func(f *aiFixture) bool { return slices.Contains(f.orders.writes, "RemoveAdjustment:a2") }},
		{"removeOrderItem", "removeOrderItem", `{"orderId":"o1","itemId":"i2","confirmed":true}`,
			func(f *aiFixture) bool { return slices.Contains(f.orders.writes, "RemoveItem:i2") }},
		{"cancelOrder", "cancelOrder", `{"orderId":"o2","confirmed":true}`,
			func(f *aiFixture) bool { return slices.Contains(f.orders.writes, "Cancel") }},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			f := newAIFixture()
			got := f.run(t, f.toolContext(t, "u1"), test.tool, test.input)
			if got != aiDone || !test.check(f) {
				t.Errorf("%s = %s; writes %v", test.tool, got, f.orders.writes)
			}
		})
	}

	t.Run("addOrderItems refuses a product that is not on the menu", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u1"), "addOrderItems", `{"orderId":"o2","items":[{"productId":"p9","quantity":1},{"productId":"p2","quantity":3}]}`)
		if !strings.Contains(got, "not in this establishment's menu: p9") || len(f.orders.writes) != 0 {
			t.Errorf("addOrderItems = %s, writes %v", got, f.orders.writes)
		}
	})

	t.Run("deleteOrder of an open order", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u1"), "deleteOrder", `{"orderId":"o1","confirmed":true}`)
		if want := `{"status":"error","message":"The action failed: CANNOT_DELETE_OPEN_ORDER"}`; got != want {
			t.Errorf("deleteOrder = %s", got)
		}
	})

	t.Run("a message without a code has no errorKey", func(t *testing.T) {
		f := newAIFixture()
		got := f.run(t, f.toolContext(t, "u1"), "removeOrderDiscount", `{"orderId":"o1","adjustmentId":"a9"}`)
		if want := `{"status":"error","message":"The action failed: Adjustment not found"}`; got != want {
			t.Errorf("removeOrderDiscount = %s", got)
		}
	})
}

func TestAIProductAndCategoryActions(t *testing.T) {
	f := newAIFixture()
	owner := f.toolContext(t, "u1")

	if got := f.run(t, owner, "createProduct", `{"name":"Tarta","categoryId":"c1","price":4.5,"currentStock":6}`); got != aiDone {
		t.Fatalf("createProduct = %s", got)
	}
	created := f.products.created
	if created.Name != "Tarta" || created.CategoryID != "c1" || created.Price != 450 || created.CurrentStock != 6 || created.MinStockAlert != 0 {
		t.Errorf("created %+v", created)
	}

	if got := f.run(t, owner, "updateProduct", `{"productId":"p1","price":2.75,"categoryId":""}`); got != aiDone {
		t.Fatalf("updateProduct = %s", got)
	}
	changes := f.products.updatedWith
	if *changes.Price != 275 || changes.CategoryID != nil || changes.Name != nil || changes.MinStockAlert != nil {
		t.Errorf("changes %+v", changes)
	}
	if got := f.run(t, owner, "updateProduct", `{"productId":"p1","price":-1}`); got != `{"status":"error","message":"The price cannot be negative."}` {
		t.Errorf("updateProduct with a negative price = %s", got)
	}
	if *f.products.updatedWith.Price != 275 {
		t.Errorf("a negative price was saved: %d", *f.products.updatedWith.Price)
	}

	if got := f.run(t, owner, "updateProductStock", `{"productId":"p1","currentStock":12}`); got != aiDone || f.products.products["p1"].CurrentStock != 12 {
		t.Errorf("updateProductStock = %s, stock %d", got, f.products.products["p1"].CurrentStock)
	}
	if got := f.run(t, owner, "adjustProductStock", `{"productId":"p1","delta":-3}`); got != aiDone || f.products.products["p1"].CurrentStock != 9 {
		t.Errorf("adjustProductStock = %s, stock %d", got, f.products.products["p1"].CurrentStock)
	}
	if got := f.run(t, owner, "deleteProduct", `{"productId":"p2","confirmed":true}`); got != aiDone || !f.products.deleted["p2"] {
		t.Errorf("deleteProduct = %s", got)
	}

	if got := f.run(t, owner, "createCategory", `{"name":"Postres","icon":"cake"}`); got != aiDone {
		t.Errorf("createCategory = %s", got)
	}
	if got := f.run(t, owner, "updateCategory", `{"categoryId":"c1","icon":"sports_bar"}`); got != aiDone {
		t.Errorf("updateCategory = %s", got)
	}
	if got := f.run(t, owner, "deleteCategory", `{"categoryId":"c2","confirmed":true}`); got != aiDone {
		t.Errorf("deleteCategory = %s", got)
	}

	categories := f.run(t, owner, "listCategories", `{}`)
	want := `{"status":"ok","message":"Query completed.","data":[{"id":"c1","name":"Bebidas","icon":"sports_bar"},{"id":"cat-new","name":"Postres","icon":"cake"}]}`
	if categories != want {
		t.Errorf("categories after the changes = %s\nwant %s", categories, want)
	}
}

func TestAIShiftActions(t *testing.T) {
	f := newAIFixture()
	owner := f.toolContext(t, "u1")

	got := f.run(t, owner, "createShift", `{"userId":"u2","startTime":"2026-10-01T16:00:00+02:00","endTime":"2026-10-01T23:00:00Z","notes":"cierre"}`)
	if got != aiDone || len(f.shifts.shifts) != 3 || *f.shifts.shifts[2].Notes != "cierre" {
		t.Fatalf("createShift = %s, shifts %+v", got, f.shifts.shifts)
	}

	notMember := `{"status":"error","message":"The action failed: MEMBER_NOT_FOUND","errorKey":"MEMBER_NOT_FOUND"}`
	if got := f.run(t, owner, "createShift", `{"userId":"u9","startTime":"2026-10-01T16:00:00Z","endTime":"2026-10-01T23:00:00Z"}`); got != notMember {
		t.Errorf("createShift for somebody else = %s", got)
	}

	if got := f.run(t, owner, "deleteShift", `{"shiftId":"s2","confirmed":true}`); got != aiDone || !slices.Contains(f.shifts.deleted, "s2") {
		t.Errorf("deleteShift = %s", got)
	}

	luis := f.toolContext(t, "u2")
	if got := f.run(t, luis, "requestShiftExchange", `{"shiftId":"s1","targetUserId":""}`); got != aiDone || !slices.Contains(f.exchanges.created, "s1/u2") {
		t.Errorf("requestShiftExchange = %s, created %v", got, f.exchanges.created)
	}
}

func TestAIShiftExchangeActionsActForTheUser(t *testing.T) {
	f := newAIFixture()
	f.exchanges.exchanges["x1"] = &domain.ShiftExchangeRecord{
		ID: "x1", ShiftID: "s1", RequesterID: "u2", Status: domain.ShiftExchangePending, ShiftEstablishmentID: "e1",
		ShiftStartTime: f.shifts.shifts[0].StartTime.Time,
	}
	f.exchanges.memberships["e1/u1"] = &domain.Membership{Role: "OWNER", Active: true}
	f.exchanges.memberships["e1/u2"] = &domain.Membership{Role: "STAFF", Active: true}

	if got := f.run(t, f.toolContext(t, "u1"), "acceptShiftExchange", `{"exchangeId":"x1"}`); got != aiDone || !slices.Contains(f.exchanges.swapped, "x1/s1/u1") {
		t.Errorf("acceptShiftExchange = %s, swapped %v", got, f.exchanges.swapped)
	}

	f.exchanges.exchanges["x1"].Status = domain.ShiftExchangePending
	if got := f.run(t, f.toolContext(t, "u2"), "cancelShiftExchange", `{"exchangeId":"x1","confirmed":true}`); got != aiDone || !slices.Contains(f.exchanges.deleted, "x1") {
		t.Errorf("cancelShiftExchange = %s, deleted %v", got, f.exchanges.deleted)
	}
}

func TestAIMemberActions(t *testing.T) {
	f := newAIFixture()
	owner := f.toolContext(t, "u1")

	if got := f.run(t, owner, "inviteMember", `{"email":"eva@example.com","role":"MANAGER","confirmed":true}`); got != aiDone {
		t.Fatalf("inviteMember = %s", got)
	}
	if len(f.members.invitations) != 1 || f.members.invitations[0].Email != "eva@example.com" || *f.members.invitations[0].Role != domain.EstablishmentRoleManager {
		t.Errorf("invitations %+v", f.members.invitations)
	}

	already := f.run(t, owner, "inviteMember", `{"email":"luis@example.com","role":"STAFF","confirmed":true}`)
	if want := `{"status":"error","message":"The action failed: USER_ALREADY_MEMBER","errorKey":"USER_ALREADY_MEMBER"}`; already != want {
		t.Errorf("inviting a member = %s", already)
	}

	if got := f.run(t, owner, "removeMember", `{"memberId":"m2","confirmed":true}`); got != aiDone || !slices.Contains(f.members.removedIDs, "m2") {
		t.Errorf("removeMember = %s", got)
	}
}

func TestAIEmailCheckIsJavaScripts(t *testing.T) {
	for email, valid := range map[string]bool{
		"eva@example.com":  true,
		"eva@example":      false,
		"eva @example.com": false,
		"eva @example.com": false,
		"eva@exa mple.com": false,
		"eva@@example.com": false,
		"ñandú@correo.es":  true,
	} {
		if looksLikeEmail.MatchString(email) != valid {
			t.Errorf("%q looks like an email: %v, want %v", email, !valid, valid)
		}
	}
}

func TestAIStaffCannotSeeTheHistory(t *testing.T) {
	f := newAIFixture()
	f.security.memberships["e1/u3"] = &domain.Membership{Role: "MANAGER", Active: true}

	got := f.run(t, f.toolContext(t, "u3"), "getEstablishmentStats", `{}`)
	if !strings.HasSuffix(got, `"history":null}}`) {
		t.Errorf("a manager's stats = %s", got)
	}
}
