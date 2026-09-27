package service

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// In-memory fakes of the ports of orders and tables.

// orderEventRecorder keeps every event published.
type orderEventRecorder struct {
	mu     sync.Mutex
	events []ports.Event
}

func (r *orderEventRecorder) Publish(_ context.Context, event ports.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, event)
}

// names lists the names of the events published, in order.
func (r *orderEventRecorder) names() []string {
	names := make([]string, 0, len(r.events))
	for _, event := range r.events {
		names = append(names, event.Name())
	}
	return names
}

// orderRealtimeMessage is one message sent to a stream.
type orderRealtimeMessage struct {
	establishmentID string
	event           string
	payload         any
}

// orderRealtimeFake keeps what was sent to the streams.
type orderRealtimeFake struct {
	messages []orderRealtimeMessage
}

func (r *orderRealtimeFake) Publish(establishmentID string, event string, payload any) {
	r.messages = append(r.messages, orderRealtimeMessage{establishmentID, event, payload})
}

func (r *orderRealtimeFake) Revoke(string, string) {}

// fakeTableRepo keeps the tables by id.
type fakeTableRepo struct {
	tables  map[string]domain.Table
	renamed []string
	deleted []string
}

func newFakeTableRepo(tables ...domain.Table) *fakeTableRepo {
	repo := &fakeTableRepo{tables: map[string]domain.Table{}}
	for _, table := range tables {
		repo.tables[table.ID] = table
	}
	return repo
}

func (r *fakeTableRepo) ListOf(_ context.Context, establishmentID string) ([]domain.Table, error) {
	var tables []domain.Table
	for _, table := range r.tables {
		if table.EstablishmentID == establishmentID {
			tables = append(tables, table)
		}
	}
	slices.SortFunc(tables, func(a, b domain.Table) int { return strings.Compare(a.Name, b.Name) })
	return tables, nil
}

func (r *fakeTableRepo) FindByID(_ context.Context, tableID string) (*domain.Table, error) {
	table, ok := r.tables[tableID]
	if !ok {
		return nil, nil
	}
	return &table, nil
}

func (r *fakeTableRepo) Create(_ context.Context, establishmentID, name string) (domain.Table, error) {
	table := domain.Table{ID: "table-new", EstablishmentID: establishmentID, Name: name, Status: domain.TableFree}
	r.tables[table.ID] = table
	return table, nil
}

func (r *fakeTableRepo) Rename(_ context.Context, tableID, name string) (domain.Table, error) {
	r.renamed = append(r.renamed, tableID)
	table := r.tables[tableID]
	table.Name = name
	r.tables[tableID] = table
	return table, nil
}

func (r *fakeTableRepo) Delete(_ context.Context, tableID string) error {
	r.deleted = append(r.deleted, tableID)
	delete(r.tables, tableID)
	return nil
}

// fakeOrderRepo keeps orders by id and records what each write was asked to do. The writes
// return the stored order with the change the tests look at.
type fakeOrderRepo struct {
	orders   map[string]domain.OrderRow
	products map[string]domain.OrderProduct // what establishment e1 sells

	writes     []string
	listStatus domain.OrderStatus
	from, to   time.Time
	created    domain.NewOrder
	addition   domain.OrderItemsAddition
	updates    []domain.OrderItemUpdate
	tableID    *string
	method     domain.PaymentMethod
	merge      domain.OrderMerge
	notes      domain.OrderNotesChanges
	itemNotes  *string
	tip        int
	adjustment domain.NewOrderAdjustment
}

func newFakeOrderRepo(orders ...domain.OrderRow) *fakeOrderRepo {
	repo := &fakeOrderRepo{
		orders: map[string]domain.OrderRow{},
		products: map[string]domain.OrderProduct{
			"beer": {ID: "beer", Name: "Beer", Price: 500, TaxRate: 1000},
			"coke": {ID: "coke", Name: "Coke", Price: 300, TaxRate: 2100},
		},
	}
	for _, order := range orders {
		repo.orders[order.ID] = order
	}
	return repo
}

func (r *fakeOrderRepo) ListOf(_ context.Context, establishmentID string, status domain.OrderStatus) ([]domain.OrderRow, error) {
	r.listStatus = status
	var rows []domain.OrderRow
	for _, order := range r.orders {
		if order.EstablishmentID == establishmentID && (status == "" || order.Status == status) {
			rows = append(rows, order)
		}
	}
	return rows, nil
}

func (r *fakeOrderRepo) ListCreatedBetween(_ context.Context, establishmentID string, from, to time.Time) ([]domain.OrderRow, error) {
	r.from, r.to = from, to
	return nil, nil
}

func (r *fakeOrderRepo) FindByID(_ context.Context, orderID string) (*domain.OrderRow, error) {
	order, ok := r.orders[orderID]
	if !ok {
		return nil, nil
	}
	return &order, nil
}

func (r *fakeOrderRepo) FindByIDs(_ context.Context, orderIDs []string) ([]domain.OrderRow, error) {
	var rows []domain.OrderRow
	for _, order := range r.orders {
		if slices.Contains(orderIDs, order.ID) {
			rows = append(rows, order)
		}
	}
	slices.SortFunc(rows, func(a, b domain.OrderRow) int { return a.CreatedAt.Compare(b.CreatedAt) })
	return rows, nil
}

func (r *fakeOrderRepo) FindProducts(_ context.Context, establishmentID string, productIDs []string) ([]domain.OrderProduct, error) {
	var products []domain.OrderProduct
	for id, product := range r.products {
		if establishmentID == "e1" && slices.Contains(productIDs, id) {
			products = append(products, product)
		}
	}
	return products, nil
}

func (r *fakeOrderRepo) Create(_ context.Context, order domain.NewOrder) (domain.OrderRow, error) {
	r.writes = append(r.writes, "Create")
	r.created = order

	row := domain.OrderRow{ID: "order-new", EstablishmentID: order.EstablishmentID, TableID: order.TableID, Status: domain.OrderOpen}
	for i, item := range order.Items {
		row.Items = append(row.Items, domain.OrderItemRow{
			ID: "item-" + strconv.Itoa(i+1), OrderID: row.ID, ProductID: item.ProductID, Quantity: item.Quantity,
			PriceAtPurchase: item.Price, TaxRateAtPurchase: item.TaxRate,
		})
	}
	r.orders[row.ID] = row
	return row, nil
}

func (r *fakeOrderRepo) AddItems(_ context.Context, orderID string, addition domain.OrderItemsAddition) (domain.OrderRow, error) {
	r.writes = append(r.writes, "AddItems")
	r.addition = addition
	return r.orders[orderID], nil
}

func (r *fakeOrderRepo) BulkUpdate(_ context.Context, orderID string, updates []domain.OrderItemUpdate) (domain.OrderRow, error) {
	r.writes = append(r.writes, "BulkUpdate")
	r.updates = updates
	return r.orders[orderID], nil
}

func (r *fakeOrderRepo) Checkout(_ context.Context, orderID string, tableID *string, method domain.PaymentMethod) (domain.OrderRow, error) {
	r.writes = append(r.writes, "Checkout")
	r.tableID, r.method = tableID, method
	row := r.orders[orderID]
	row.Status = domain.OrderClosed
	return row, nil
}

func (r *fakeOrderRepo) Cancel(_ context.Context, orderID string, tableID *string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "Cancel")
	r.tableID = tableID
	row := r.orders[orderID]
	row.Status = domain.OrderCancelled
	return row, nil
}

func (r *fakeOrderRepo) MoveTable(_ context.Context, orderID string, oldTableID *string, newTableID, newTableName string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "MoveTable:"+newTableID+":"+newTableName)
	r.tableID = oldTableID
	row := r.orders[orderID]
	row.TableID = &newTableID
	return row, nil
}

func (r *fakeOrderRepo) Merge(_ context.Context, merge domain.OrderMerge) (domain.OrderRow, error) {
	r.writes = append(r.writes, "Merge")
	r.merge = merge
	return r.orders[merge.PrimaryID], nil
}

func (r *fakeOrderRepo) RemoveItem(_ context.Context, orderID, itemID string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "RemoveItem:"+itemID)
	row := r.orders[orderID]
	row.Items = slices.DeleteFunc(slices.Clone(row.Items), func(item domain.OrderItemRow) bool { return item.ID == itemID })
	return row, nil
}

func (r *fakeOrderRepo) RemoveLastItemAndCancel(_ context.Context, orderID, itemID string, tableID *string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "RemoveLastItemAndCancel:"+itemID)
	r.tableID = tableID
	row := r.orders[orderID]
	row.Items = nil
	row.Status = domain.OrderCancelled
	return row, nil
}

func (r *fakeOrderRepo) Delete(_ context.Context, orderID string) error {
	r.writes = append(r.writes, "Delete")
	delete(r.orders, orderID)
	return nil
}

func (r *fakeOrderRepo) UpdateNotes(_ context.Context, orderID string, changes domain.OrderNotesChanges) (domain.OrderRow, error) {
	r.writes = append(r.writes, "UpdateNotes")
	r.notes = changes
	return r.orders[orderID], nil
}

func (r *fakeOrderRepo) UpdateItemNotes(_ context.Context, orderID, itemID string, notes *string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "UpdateItemNotes:"+itemID)
	r.itemNotes = notes
	return r.orders[orderID], nil
}

func (r *fakeOrderRepo) UpdateTip(_ context.Context, orderID string, tipAmount int) error {
	r.writes = append(r.writes, "UpdateTip")
	r.tip = tipAmount
	return nil
}

func (r *fakeOrderRepo) AddAdjustment(_ context.Context, orderID string, adjustment domain.NewOrderAdjustment) (domain.OrderRow, error) {
	r.writes = append(r.writes, "AddAdjustment")
	r.adjustment = adjustment
	row := r.orders[orderID]
	row.Adjustments = append(slices.Clone(row.Adjustments), domain.OrderAdjustmentRow{
		ID: "adjustment-new", OrderID: orderID, Target: adjustment.Target, Type: adjustment.Type, Value: adjustment.Value,
	})
	return row, nil
}

func (r *fakeOrderRepo) RemoveAdjustment(_ context.Context, orderID, adjustmentID string) (domain.OrderRow, error) {
	r.writes = append(r.writes, "RemoveAdjustment:"+adjustmentID)
	row := r.orders[orderID]
	row.Adjustments = nil
	return row, nil
}
