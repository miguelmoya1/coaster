package httpapi

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
	"coaster-api/internal/service"
)

const (
	orderTestID   = "0b8a1b2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b"
	orderTestItem = "1c9b2c3f-4d5e-4f60-9bac-1d2e3f4a5b6c"
	orderTestProd = "2dac3d40-5e6f-4071-8cbd-2e3f4a5b6c7d"
)

type orderHandlerRepo struct {
	ports.OrderRepository
	writes    []string
	createdBy *string
}

func (r *orderHandlerRepo) order() domain.OrderRow {
	createdAt := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	return domain.OrderRow{
		ID: orderTestID, EstablishmentID: "e1", Status: domain.OrderOpen, TotalAmount: 500, PaymentMethod: domain.PaymentNone,
		CreatedAt: createdAt, UpdatedAt: createdAt,
		Items: []domain.OrderItemRow{{
			ID: orderTestItem, OrderID: orderTestID, ProductID: orderTestProd, ProductName: "Beer", Quantity: 1,
			PriceAtPurchase: 500, TaxRateAtPurchase: 1000, PaymentStatus: domain.PaymentPending,
			DeliveryStatus: domain.DeliveryPending, PaymentMethod: domain.PaymentNone, CreatedAt: createdAt, UpdatedAt: createdAt,
		}},
	}
}

func (r *orderHandlerRepo) ListOf(context.Context, string, domain.OrderStatus) ([]domain.OrderRow, error) {
	return []domain.OrderRow{r.order()}, nil
}

func (r *orderHandlerRepo) FindByID(_ context.Context, orderID string) (*domain.OrderRow, error) {
	if orderID != orderTestID {
		return nil, nil
	}
	order := r.order()
	return &order, nil
}

func (r *orderHandlerRepo) FindProducts(context.Context, string, []string) ([]domain.OrderProduct, error) {
	return []domain.OrderProduct{{ID: orderTestProd, Name: "Beer", Price: 500, TaxRate: 1000}}, nil
}

func (r *orderHandlerRepo) Create(_ context.Context, order domain.NewOrder) (domain.OrderRow, error) {
	r.writes = append(r.writes, "Create")
	r.createdBy = order.CreatedByID
	return r.order(), nil
}

func (r *orderHandlerRepo) BulkUpdate(context.Context, string, []domain.OrderItemUpdate) (domain.OrderRow, error) {
	r.writes = append(r.writes, "BulkUpdate")
	return r.order(), nil
}

func (r *orderHandlerRepo) UpdateTip(context.Context, string, int) error {
	r.writes = append(r.writes, "UpdateTip")
	return nil
}

func (r *orderHandlerRepo) RemoveLastItemAndCancel(context.Context, string, string, *string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "RemoveLastItemAndCancel")
	return r.order(), nil
}

type tableHandlerRepo struct {
	ports.TableRepository
	writes []string
}

func (r *tableHandlerRepo) table() domain.Table {
	at := domain.NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC))
	return domain.Table{ID: "t1", EstablishmentID: "e1", Name: "Mesa 1", Status: domain.TableFree, CreatedAt: at, UpdatedAt: at}
}

func (r *tableHandlerRepo) ListOf(context.Context, string) ([]domain.Table, error) {
	return []domain.Table{r.table()}, nil
}

func (r *tableHandlerRepo) FindByID(_ context.Context, tableID string) (*domain.Table, error) {
	if tableID != "t1" {
		return nil, nil
	}
	table := r.table()
	return &table, nil
}

func (r *tableHandlerRepo) Create(context.Context, string, string) (domain.Table, error) {
	r.writes = append(r.writes, "Create")
	return r.table(), nil
}

func (r *tableHandlerRepo) Rename(context.Context, string, string) (domain.Table, error) {
	r.writes = append(r.writes, "Rename")
	return r.table(), nil
}

func (r *tableHandlerRepo) Delete(context.Context, string) error {
	r.writes = append(r.writes, "Delete")
	return nil
}

func newOrderServer(modules []domain.EstablishmentModule) (http.Handler, *orderHandlerRepo, *tableHandlerRepo) {
	orders := &orderHandlerRepo{}
	tables := &tableHandlerRepo{}

	guard := testGuard(fakeAccess{platformRole: domain.RoleAdmin, modules: modules})
	mux := http.NewServeMux()
	NewOrderHandler(service.NewOrderService(orders, tables, discardEvents{})).RegisterRoutes(mux, guard)
	NewTableHandler(service.NewTableService(tables, discardEvents{})).RegisterRoutes(mux, guard)

	return mux, orders, tables
}

func TestOrderRoutesNeedTheOrdersModule(t *testing.T) {
	server, _, _ := newOrderServer([]domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleInventory})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	routes := []string{
		"GET /api/v1/establishments/e1/orders",
		"GET /api/v1/establishments/e1/orders/o1",
		"POST /api/v1/establishments/e1/orders",
		"POST /api/v1/establishments/e1/orders/o1/items",
		"PATCH /api/v1/establishments/e1/orders/o1/items/bulk",
		"POST /api/v1/establishments/e1/orders/o1/checkout",
		"POST /api/v1/establishments/e1/orders/o1/cancel",
		"PATCH /api/v1/establishments/e1/orders/o1/move-table",
		"POST /api/v1/establishments/e1/orders/merge",
		"DELETE /api/v1/establishments/e1/orders/o1/items/i1",
		"DELETE /api/v1/establishments/e1/orders/o1",
		"PATCH /api/v1/establishments/e1/orders/o1/tip",
		"PATCH /api/v1/establishments/e1/orders/o1/notes",
		"PATCH /api/v1/establishments/e1/orders/o1/items/i1/notes",
		"POST /api/v1/establishments/e1/orders/o1/adjustments",
		"DELETE /api/v1/establishments/e1/orders/o1/adjustments/a1",
		"GET /api/v1/establishments/e1/tables",
		"POST /api/v1/establishments/e1/tables",
		"PATCH /api/v1/establishments/e1/tables/t1",
		"DELETE /api/v1/establishments/e1/tables/t1",
	}

	for _, route := range routes {
		method, target, _ := strings.Cut(route, " ")

		if response := send(server, method, target, "", nil); response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}

		response := send(server, method, target, "", signedIn)
		want := `{"message":"MODULE_NOT_ENABLED","error":"Forbidden","statusCode":403}`
		if response.Code != http.StatusForbidden || response.Body.String() != want {
			t.Errorf("%s without orders = %d %s", route, response.Code, response.Body)
		}
	}
}

func TestOrderValidation(t *testing.T) {
	server, _, _ := newOrderServer(domain.AllEstablishmentModules)
	signedIn := map[string]string{"Authorization": "Bearer good"}
	orders := "/api/v1/establishments/e1/orders"
	order := orders + "/" + orderTestID

	tests := []struct {
		name  string
		route string
		body  string
		want  string
	}{
		{"an order without lines", "POST " + orders, `{"items":[]}`, `["REQUIRED"]`},
		{"an order without items", "POST " + orders, `{}`, `["INVALID_TYPE"]`},
		{"a line without a product", "POST " + orders, `{"items":[{"quantity":1}]}`, `["items.0.REQUIRED"]`},
		{"a product that is not a UUID", "POST " + orders, `{"items":[{"productId":"beer","quantity":1}]}`, `["items.0.INVALID_TYPE"]`},
		{"no units", "POST " + orders, `{"items":[{"productId":"` + orderTestProd + `","quantity":0}]}`, `["items.0.INVALID_TYPE"]`},
		{"half a unit", "POST " + orders, `{"items":[{"productId":"` + orderTestProd + `","quantity":1.5}]}`, `["items.0.INVALID_TYPE"]`},
		{"a table that is not a UUID", "POST " + orders, `{"tableId":"t1","items":[{"productId":"` + orderTestProd + `","quantity":1}]}`, `["INVALID_TYPE"]`},
		{"a negative tip on a new order", "POST " + orders, `{"tipAmount":-1,"items":[{"productId":"` + orderTestProd + `","quantity":1}]}`, `["INVALID_TYPE"]`},
		{"a discount of more than 100 %", "POST " + orders,
			`{"items":[{"productId":"` + orderTestProd + `","quantity":1}],"adjustments":[{"target":"ORDER","type":"PERCENTAGE","value":101}]}`,
			`["adjustments.0.INVALID_TYPE"]`},
		{"an unknown field", "POST " + orders, `{"items":[{"productId":"` + orderTestProd + `","quantity":1}],"waiter":"Ana"}`, `["property waiter should not exist"]`},
		{"added lines", "POST " + order + "/items", `{"items":[]}`, `["REQUIRED"]`},
		{"a bulk update of nothing", "PATCH " + order + "/items/bulk", `{"items":[]}`, `["REQUIRED"]`},
		{"a bulk line that is not a UUID", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"i1"}]}`, `["items.0.INVALID_TYPE"]`},
		{"negative units served", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","servedQuantity":-1}]}`, `["items.0.INVALID_TYPE"]`},
		{"paying a line with NONE", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","paidQuantity":1,"paymentMethod":"NONE"}]}`, `["items.0.INVALID_TYPE"]`},
		{"paying a line with MIXED", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","paidQuantity":1,"paymentMethod":"MIXED"}]}`, `["items.0.INVALID_TYPE"]`},
		{"an unknown way to pay", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","paymentMethod":"BITCOIN"}]}`, `["items.0.INVALID_TYPE"]`},
		{"checkout without a method", "POST " + order + "/checkout", `{}`, `["REQUIRED"]`},
		{"checkout with NONE", "POST " + order + "/checkout", `{"paymentMethod":"NONE"}`, `["INVALID_TYPE"]`},
		{"checkout with MIXED", "POST " + order + "/checkout", `{"paymentMethod":"MIXED"}`, `["INVALID_TYPE"]`},
		{"moving without a table", "PATCH " + order + "/move-table", `{}`, `["REQUIRED"]`},
		{"merging one order", "POST " + orders + "/merge", `{"orderIds":["` + orderTestID + `"]}`, `["INVALID_ORDER_IDS"]`},
		{"merging an id that is not a UUID", "POST " + orders + "/merge", `{"orderIds":["a","` + orderTestID + `"]}`, `["INVALID_TYPE"]`},
		{"a negative tip", "PATCH " + order + "/tip", `{"tipAmount":-5}`, `["INVALID_TYPE"]`},
		{"a tip that is not a number", "PATCH " + order + "/tip", `{"tipAmount":"5"}`, `["INVALID_TYPE"]`},
		{"notes too long", "PATCH " + order + "/notes", `{"ticketNotes":"` + strings.Repeat("a", 501) + `"}`, `["INVALID_TYPE"]`},
		{"line notes too long", "PATCH " + order + "/items/" + orderTestItem + "/notes", `{"notes":"` + strings.Repeat("a", 501) + `"}`, `["INVALID_TYPE"]`},
		{"a discount on nothing", "POST " + order + "/adjustments", `{"target":"TABLE","type":"FIXED_AMOUNT","value":100}`, `["INVALID_TYPE"]`},
		{"a discount of nothing", "POST " + order + "/adjustments", `{"target":"ORDER","type":"FIXED_AMOUNT","value":0}`, `["INVALID_TYPE"]`},
		{"a percentage over 100", "POST " + order + "/adjustments", `{"target":"ORDER","type":"PERCENTAGE","value":150}`, `["INVALID_TYPE"]`},
		{"a table without a name", "POST /api/v1/establishments/e1/tables", `{}`, `["REQUIRED"]`},
		{"a table name that is not text", "PATCH /api/v1/establishments/e1/tables/t1", `{"name":5}`, `["INVALID_TYPE"]`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, signedIn)
			want := `{"message":` + tt.want + `,"error":"Bad Request","statusCode":400}`
			if response.Code != http.StatusBadRequest || response.Body.String() != want {
				t.Errorf("%s = %d %s\nwant %s", tt.route, response.Code, response.Body, want)
			}
		})
	}
}

func TestOrderAndTableResponses(t *testing.T) {
	signedIn := map[string]string{"Authorization": "Bearer good"}
	orders := "/api/v1/establishments/e1/orders"
	order := orders + "/" + orderTestID

	tests := []struct {
		name   string
		route  string
		body   string
		status int
		want   string
	}{
		{"list", "GET " + orders + "?status=OPEN", "", http.StatusOK, `[{"id":"` + orderTestID + `","establishmentId":"e1","status":"OPEN"`},
		{"get", "GET " + order, "", http.StatusOK, `{"id":"` + orderTestID + `","establishmentId":"e1","status":"OPEN","totalAmount":500`},
		{"get another", "GET " + orders + "/missing", "", http.StatusNotFound, `{"message":"ORDER_NOT_FOUND","error":"Not Found","statusCode":404}`},
		{"create", "POST " + orders, `{"items":[{"productId":"` + orderTestProd + `","quantity":1}]}`, http.StatusCreated, ""},
		{"bulk", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","paidQuantity":2}]}`, http.StatusBadRequest,
			`{"message":"PAY_QUANTITY_EXCEEDS_TOTAL","error":"Bad Request","statusCode":400}`},
		{"bulk", "PATCH " + order + "/items/bulk", `{"items":[{"itemId":"` + orderTestItem + `","servedQuantity":1}]}`, http.StatusOK, ""},
		{"tip", "PATCH " + order + "/tip", `{"tipAmount":100}`, http.StatusOK, ""},
		{"removing the last line", "DELETE " + order + "/items/" + orderTestItem, "", http.StatusOK, ""},
		{"removing a discount that is not there", "DELETE " + order + "/adjustments/a1", "", http.StatusNotFound,
			`{"message":"Adjustment not found","error":"Not Found","statusCode":404}`},
		{"a discount on a line without the line", "POST " + order + "/adjustments", `{"target":"ITEM","type":"FIXED_AMOUNT","value":100}`, http.StatusBadRequest,
			`{"message":"itemId is required for ITEM target","error":"Bad Request","statusCode":400}`},
		{"deleting an open order", "DELETE " + order, "", http.StatusBadRequest, `{"message":"CANNOT_DELETE_OPEN_ORDER","error":"Bad Request","statusCode":400}`},
		{"an unknown status", "GET " + orders + "?status=PAID", "", http.StatusBadRequest, `{"message":"INVALID_TYPE","error":"Bad Request","statusCode":400}`},
		{"tables", "GET /api/v1/establishments/e1/tables", "", http.StatusOK,
			`[{"id":"t1","establishmentId":"e1","name":"Mesa 1","status":"FREE","createdAt":"2026-09-27T10:00:00.000Z","updatedAt":"2026-09-27T10:00:00.000Z"}]`},
		{"create a table", "POST /api/v1/establishments/e1/tables", `{"name":"Mesa 2"}`, http.StatusCreated, ""},
		{"rename a table", "PATCH /api/v1/establishments/e1/tables/t1", `{"name":"Mesa 1b"}`, http.StatusOK, `{"success":true}`},
		{"delete a table", "DELETE /api/v1/establishments/e1/tables/t1", "", http.StatusOK, `{"success":true}`},
		{"delete a table of another", "DELETE /api/v1/establishments/e1/tables/t9", "", http.StatusNotFound,
			`{"message":"TABLE_NOT_FOUND","error":"Not Found","statusCode":404}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, _, _ := newOrderServer(domain.AllEstablishmentModules)
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, signedIn)
			if response.Code != tt.status || !strings.HasPrefix(response.Body.String(), tt.want) || (tt.want == "" && response.Body.Len() != 0) {
				t.Errorf("%s = %d %s\nwant %d %s", tt.route, response.Code, response.Body, tt.status, tt.want)
			}
		})
	}
}

func TestOrderCreateRecordsWhoOpenedIt(t *testing.T) {
	server, orders, _ := newOrderServer(domain.AllEstablishmentModules)

	response := send(server, "POST", "/api/v1/establishments/e1/orders", `{"items":[{"productId":"`+orderTestProd+`","quantity":1}]}`,
		map[string]string{"Authorization": "Bearer good"})

	if response.Code != http.StatusCreated || orders.createdBy == nil || *orders.createdBy != testUser.ID {
		t.Fatalf("status %d, created by %v", response.Code, orders.createdBy)
	}
}
