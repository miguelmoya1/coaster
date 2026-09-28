package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// orderNoteMaxLength is where Nest cuts the notes of an order, of a line and the reason of a
// discount (substring(0, 500)).
const orderNoteMaxLength = 500

// OrderService is the orders module: an establishment's orders with their lines, discounts,
// payments and tables. Each method is one of the commands or queries of Nest.
type OrderService struct {
	orders ports.OrderRepository
	tables ports.TableRepository
	events ports.EventPublisher
	now    func() time.Time
}

func NewOrderService(orders ports.OrderRepository, tables ports.TableRepository, events ports.EventPublisher) *OrderService {
	return &OrderService{orders: orders, tables: tables, events: events, now: time.Now}
}

// OrderLineInput is CreateOrderItemDto: a product, how many units and a note.
type OrderLineInput struct {
	ProductID string
	Quantity  int
	Notes     *string
}

// OrderAdjustmentInput is AddOrderAdjustmentDto: a discount on the order or on one line.
type OrderAdjustmentInput struct {
	Target domain.AdjustmentTarget
	Type   domain.AdjustmentType
	Value  int
	Reason *string
	ItemID *string
}

// CreateOrderInput is CreateOrderDto, plus who opens the order ("" for nobody).
type CreateOrderInput struct {
	CreatedByID string
	TableID     *string
	Items       []OrderLineInput
	Notes       *string
	Adjustments []OrderAdjustmentInput
	TipAmount   *int
}

// AddOrderItemsInput is AddOrderItemsDto. ClearNotes is notes sent as null, which empties them.
type AddOrderItemsInput struct {
	Items      []OrderLineInput
	Notes      *string
	ClearNotes bool
}

// MergeOrdersInput is MergeOrdersDto.
type MergeOrdersInput struct {
	OrderIDs      []string
	TargetTableID *string
}

// UpdateOrderNotesInput is UpdateOrderNotesDto. A nil field is left as it is.
type UpdateOrderNotesInput struct {
	Notes       *string
	TicketNotes *string
}

// List is GetOrdersByEstablishmentIdQuery: the establishment's orders, newest first. An empty
// status lists them all.
func (s *OrderService) List(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.Order, error) {
	switch status {
	case "", domain.OrderOpen, domain.OrderClosed, domain.OrderCancelled:
	default:
		return nil, domain.BadRequest(domain.CodeInvalidType)
	}

	rows, err := s.orders.ListOf(ctx, establishmentID, status)
	if err != nil {
		return nil, err
	}
	return toOrders(rows), nil
}

// ListByDate is GetOrdersByDateQuery: the orders created on a day (YYYY-MM-DD, in UTC),
// newest first. A date that is not one fails like Temporal.PlainDate.from does in Nest: with
// a 500.
func (s *OrderService) ListByDate(ctx context.Context, establishmentID, date string) ([]domain.Order, error) {
	day, err := time.Parse(time.DateOnly, date)
	if err != nil {
		return nil, fmt.Errorf("reading the date %q: %w", date, err)
	}

	rows, err := s.orders.ListCreatedBetween(ctx, establishmentID, day, day.AddDate(0, 0, 1))
	if err != nil {
		return nil, err
	}
	return toOrders(rows), nil
}

// Get is GetOrderByIdQuery.
func (s *OrderService) Get(ctx context.Context, establishmentID, orderID string) (domain.Order, error) {
	order, err := s.find(ctx, establishmentID, orderID)
	if err != nil {
		return domain.Order{}, err
	}
	return order.ToOrder(), nil
}

// Create is CreateOrderCommand: it opens an order with its lines, discounts and tip, and
// occupies its table if it has one.
func (s *OrderService) Create(ctx context.Context, establishmentID string, input CreateOrderInput) error {
	items, totalAmount, err := s.priceLines(ctx, establishmentID, input.Items)
	if err != nil {
		return err
	}

	var tableName *string
	if input.TableID != nil && *input.TableID != "" {
		table, err := s.findTable(ctx, establishmentID, *input.TableID)
		if err != nil {
			return err
		}
		if table.Status == domain.TableOccupied {
			return domain.BadRequest(domain.CodeTableAlreadyOccupied)
		}
		tableName = &table.Name
	}

	adjustments := make([]domain.NewOrderAdjustment, 0, len(input.Adjustments))
	for _, adjustment := range input.Adjustments {
		if adjustment.Target == domain.AdjustmentItem {
			if adjustment.ItemID == nil || *adjustment.ItemID == "" {
				return domain.BadRequest(domain.MessageItemIDRequiredForItemTarget)
			}
			return domain.NotFound(domain.CodeOrderItemNotFound)
		}
		adjustments = append(adjustments, newOrderAdjustment(adjustment))
	}

	var createdByID *string
	if input.CreatedByID != "" {
		createdByID = &input.CreatedByID
	}

	tipAmount := 0
	if input.TipAmount != nil {
		tipAmount = *input.TipAmount
	}

	row, err := s.orders.Create(ctx, domain.NewOrder{
		EstablishmentID: establishmentID,
		CreatedByID:     createdByID,
		TableID:         tableIDOrNil(input.TableID),
		TableName:       tableName,
		TotalAmount:     totalAmount,
		Items:           items,
		Adjustments:     adjustments,
		TipAmount:       tipAmount,
		Notes:           cutOrderNote(input.Notes),
	})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderCreatedEvent{
		EstablishmentID: establishmentID,
		Order:           row.ToOrder(),
		TableID:         tableIDOrNil(input.TableID),
	})
	return nil
}

// AddItems is AddOrderItemsCommand: more lines for an open order.
func (s *OrderService) AddItems(ctx context.Context, establishmentID, orderID string, input AddOrderItemsInput) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	items, addedAmount, err := s.priceLines(ctx, establishmentID, input.Items)
	if err != nil {
		return err
	}

	addition := domain.OrderItemsAddition{Items: items, TotalAmount: order.TotalAmount + addedAmount}
	if input.Notes != nil || input.ClearNotes {
		addition.ChangeNotes = true
		addition.Notes = cutOrderNote(input.Notes)
	}

	row, err := s.orders.AddItems(ctx, orderID, addition)
	if err != nil {
		return err
	}

	added := make([]domain.OrderStockLine, 0, len(input.Items))
	for _, line := range input.Items {
		added = append(added, domain.OrderStockLine{ProductID: line.ProductID, Quantity: line.Quantity})
	}

	s.events.Publish(ctx, domain.OrderItemsAddedEvent{EstablishmentID: establishmentID, Order: row.ToOrder(), AddedItems: added})
	return nil
}

// BulkUpdate is BulkUpdateOrderCommand: how many units of each line are paid (and how) and
// served. It never takes more units than a line has.
func (s *OrderService) BulkUpdate(ctx context.Context, establishmentID, orderID string, updates []domain.OrderItemUpdate) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	for _, update := range updates {
		item, ok := order.FindItem(update.ItemID)
		if !ok {
			return domain.NotFound(domain.CodeOrderItemNotFound)
		}

		if update.PaidQuantity != nil {
			paying := *update.PaidQuantity > item.PaidQuantity
			if paying && update.PaymentMethod != nil && *update.PaymentMethod != domain.PaymentCash && *update.PaymentMethod != domain.PaymentCard {
				return domain.BadRequest(domain.CodeInvalidType)
			}
			if *update.PaidQuantity > item.Quantity {
				return domain.BadRequest(domain.MessagePayQuantityExceedsTotal)
			}
			if *update.PaidQuantity < 0 {
				return domain.BadRequest(domain.MessagePayQuantityCannotBeNegative)
			}
		}

		if update.ServedQuantity != nil {
			if *update.ServedQuantity > item.Quantity {
				return domain.BadRequest(domain.MessageServeQuantityExceedsTotal)
			}
			if *update.ServedQuantity < 0 {
				return domain.BadRequest(domain.MessageServeQuantityCannotBeNegative)
			}
		}
	}

	row, err := s.orders.BulkUpdate(ctx, orderID, updates)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderUpdatedEvent{EstablishmentID: establishmentID, Order: row.ToOrder()})
	return nil
}

// Checkout is CheckoutOrderCommand: it closes the order, charges what is pending by card or in
// cash and frees its table. Of two checkouts at once, only one closes it.
func (s *OrderService) Checkout(ctx context.Context, establishmentID, orderID string, method domain.PaymentMethod) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	row, err := s.orders.Checkout(ctx, orderID, order.TableID, method)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderClosedEvent{EstablishmentID: establishmentID, Order: row.ToOrder(), TableID: order.TableID})
	return nil
}

// Cancel is CancelOrderCommand: the order is cancelled, its table freed and its units go
// back to stock.
func (s *OrderService) Cancel(ctx context.Context, establishmentID, orderID string) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	row, err := s.orders.Cancel(ctx, orderID, order.TableID)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderCancelledEvent{EstablishmentID: establishmentID, Order: row.ToOrder(), TableID: order.TableID})
	return nil
}

// MoveTable is MoveOrderTableCommand: the order goes to a free table of the establishment.
func (s *OrderService) MoveTable(ctx context.Context, establishmentID, orderID, tableID string) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	table, err := s.findTable(ctx, establishmentID, tableID)
	if err != nil {
		return err
	}
	if order.TableID != nil && *order.TableID == tableID {
		return nil
	}
	if table.Status == domain.TableOccupied {
		return domain.BadRequest(domain.CodeTableAlreadyOccupied)
	}

	row, err := s.orders.MoveTable(ctx, orderID, order.TableID, tableID, table.Name)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderTableMovedEvent{
		EstablishmentID: establishmentID,
		Order:           row.ToOrder(),
		OldTableID:      order.TableID,
		NewTableID:      tableID,
	})
	return nil
}

// Merge is MergeOrdersCommand: the open orders go into the oldest one, which can move to
// another table on the way.
func (s *OrderService) Merge(ctx context.Context, establishmentID string, input MergeOrdersInput) error {
	orders, err := s.orders.FindByIDs(ctx, input.OrderIDs)
	if err != nil {
		return err
	}
	if len(orders) != len(input.OrderIDs) {
		return domain.NotFound(domain.CodeOrderNotFound)
	}
	if len(orders) == 0 {
		return errors.New("merging needs at least one order")
	}

	for _, order := range orders {
		if order.EstablishmentID != establishmentID {
			return domain.NotFound(domain.CodeOrderNotFound)
		}
	}
	for _, order := range orders {
		if order.Status != domain.OrderOpen {
			return domain.BadRequest(domain.CodeOrderNotOpen)
		}
	}

	targetTableID := tableIDOrNil(input.TargetTableID)
	if targetTableID != nil {
		table, err := s.findTable(ctx, establishmentID, *targetTableID)
		if err != nil {
			return err
		}
		if table.Status == domain.TableOccupied && !anyOrderAtTable(orders, table.ID) {
			return domain.BadRequest(domain.CodeTableAlreadyOccupied)
		}
	}

	primary := orders[0]
	merge := domain.OrderMerge{
		PrimaryID:        primary.ID,
		PrimaryTableID:   primary.TableID,
		PrimaryTableName: primary.TableName,
		TargetTableID:    targetTableID,
	}
	for _, source := range orders[1:] {
		merge.Sources = append(merge.Sources, domain.MergedOrder{ID: source.ID, TableID: source.TableID})
	}

	row, err := s.orders.Merge(ctx, merge)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrdersMergedEvent{
		EstablishmentID: establishmentID,
		PrimaryOrder:    row.ToOrder(),
		SourceOrders:    merge.Sources,
	})
	return nil
}

// RemoveItem is RemoveOrderItemCommand. Removing the last line cancels the order.
func (s *OrderService) RemoveItem(ctx context.Context, establishmentID, orderID, itemID string) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	item, ok := order.FindItem(itemID)
	if !ok {
		return domain.NotFound(domain.CodeOrderItemNotFound)
	}
	removed := domain.OrderStockLine{ProductID: item.ProductID, Quantity: item.Quantity}

	if len(order.Items) == 1 {
		row, err := s.orders.RemoveLastItemAndCancel(ctx, orderID, itemID, order.TableID)
		if err != nil {
			return err
		}

		cancelled := row.ToOrder()
		s.events.Publish(ctx, domain.OrderItemRemovedEvent{EstablishmentID: establishmentID, Order: cancelled, RemovedItem: removed})
		s.events.Publish(ctx, domain.OrderCancelledEvent{EstablishmentID: establishmentID, Order: cancelled, TableID: order.TableID})
		return nil
	}

	row, err := s.orders.RemoveItem(ctx, orderID, itemID)
	if err != nil {
		return err
	}

	updated := row.ToOrder()
	s.events.Publish(ctx, domain.OrderItemRemovedEvent{EstablishmentID: establishmentID, Order: updated, RemovedItem: removed})
	s.events.Publish(ctx, domain.OrderUpdatedEvent{EstablishmentID: establishmentID, Order: updated})
	return nil
}

// Delete is DeleteOrderCommand: only an order that is no longer open, is not in a cash
// close and was created today (UTC) can be deleted.
func (s *OrderService) Delete(ctx context.Context, establishmentID, orderID string) error {
	order, err := s.find(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	if order.Status == domain.OrderOpen {
		return domain.BadRequest(domain.MessageCannotDeleteOpenOrder)
	}
	if order.CashCloseID != nil && *order.CashCloseID != "" {
		return domain.BadRequest(domain.CodeOrderInCashClose)
	}
	if orderDayUTC(order.CreatedAt).Before(orderDayUTC(s.now())) {
		return domain.BadRequest(domain.MessageCannotDeletePastOrder)
	}

	if err := s.orders.Delete(ctx, orderID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderDeletedEvent{EstablishmentID: establishmentID, OrderID: orderID})
	return nil
}

// UpdateTip is UpdateOrderTipCommand.
func (s *OrderService) UpdateTip(ctx context.Context, establishmentID, orderID string, tipAmount int) error {
	if _, err := s.findOpen(ctx, establishmentID, orderID); err != nil {
		return err
	}
	if tipAmount < 0 {
		return domain.BadRequest(domain.MessageTipCannotBeNegative)
	}

	if err := s.orders.UpdateTip(ctx, orderID, tipAmount); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderTipUpdatedEvent{EstablishmentID: establishmentID, OrderID: orderID, TipAmount: tipAmount})
	return nil
}

// UpdateNotes is UpdateOrderNotesCommand: the notes that come are trimmed, and empty ones
// are removed.
func (s *OrderService) UpdateNotes(ctx context.Context, establishmentID, orderID string, input UpdateOrderNotesInput) error {
	if _, err := s.findOpen(ctx, establishmentID, orderID); err != nil {
		return err
	}

	var changes domain.OrderNotesChanges
	if input.Notes != nil {
		changes.ChangeNotes = true
		changes.Notes = trimOrderNote(*input.Notes)
	}
	if input.TicketNotes != nil {
		changes.ChangeTicketNotes = true
		changes.TicketNotes = trimOrderNote(*input.TicketNotes)
	}

	row, err := s.orders.UpdateNotes(ctx, orderID, changes)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderUpdatedEvent{EstablishmentID: establishmentID, Order: row.ToOrder()})
	return nil
}

// UpdateItemNotes is UpdateOrderItemNotesCommand: the note is trimmed, and without one (or
// with an empty one) the line's note is removed.
func (s *OrderService) UpdateItemNotes(ctx context.Context, establishmentID, orderID, itemID string, notes *string) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}
	if _, ok := order.FindItem(itemID); !ok {
		return domain.NotFound(domain.CodeOrderItemNotFound)
	}

	var trimmed *string
	if notes != nil {
		trimmed = trimOrderNote(*notes)
	}

	row, err := s.orders.UpdateItemNotes(ctx, orderID, itemID, trimmed)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderUpdatedEvent{EstablishmentID: establishmentID, Order: row.ToOrder()})
	return nil
}

// AddAdjustment is AddOrderAdjustmentCommand: a discount on the order or on one of its
// lines, as long as the order's total does not go below zero.
func (s *OrderService) AddAdjustment(ctx context.Context, establishmentID, orderID string, input OrderAdjustmentInput) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}

	var item domain.OrderItemRow
	if input.Target == domain.AdjustmentItem {
		if input.ItemID == nil || *input.ItemID == "" {
			return domain.BadRequest(domain.MessageItemIDRequiredForItemTarget)
		}
		found, ok := order.FindItem(*input.ItemID)
		if !ok {
			return domain.NotFound(domain.CodeOrderItemNotFound)
		}
		item = found
	}

	discount := 0
	switch input.Type {
	case domain.AdjustmentFixedAmount:
		discount = input.Value
	case domain.AdjustmentPercentage:
		switch input.Target {
		case domain.AdjustmentOrder:
			discount = domain.PercentageOf(order.TotalAmount, input.Value)
		case domain.AdjustmentItem:
			discount = domain.PercentageOf(item.PriceAtPurchase*item.Quantity, input.Value)
		}
	}

	pricing := order.Pricing()
	left := pricing.NetTotal
	if input.Target == domain.AdjustmentItem {
		left = lineFinalTotal(pricing, item.ID)
	}
	if discount > left {
		return domain.BadRequest(domain.MessageNegativeTotalNotAllowed)
	}

	row, err := s.orders.AddAdjustment(ctx, orderID, newOrderAdjustment(input))
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderAdjustmentsUpdatedEvent{
		EstablishmentID: establishmentID,
		OrderID:         orderID,
		Adjustments:     row.ToAdjustments(),
	})
	return nil
}

// RemoveAdjustment is RemoveOrderAdjustmentCommand.
func (s *OrderService) RemoveAdjustment(ctx context.Context, establishmentID, orderID, adjustmentID string) error {
	order, err := s.findOpen(ctx, establishmentID, orderID)
	if err != nil {
		return err
	}
	if !order.HasAdjustment(adjustmentID) {
		return domain.NotFound(domain.MessageAdjustmentNotFound)
	}

	row, err := s.orders.RemoveAdjustment(ctx, orderID, adjustmentID)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.OrderAdjustmentsUpdatedEvent{
		EstablishmentID: establishmentID,
		OrderID:         orderID,
		Adjustments:     row.ToAdjustments(),
	})
	return nil
}

// find returns the establishment's order, or ORDER_NOT_FOUND.
func (s *OrderService) find(ctx context.Context, establishmentID, orderID string) (domain.OrderRow, error) {
	order, err := s.orders.FindByID(ctx, orderID)
	if err != nil {
		return domain.OrderRow{}, err
	}
	if order == nil || order.EstablishmentID != establishmentID {
		return domain.OrderRow{}, domain.NotFound(domain.CodeOrderNotFound)
	}
	return *order, nil
}

// findOpen is find for an order that has to be open (ORDER_NOT_OPEN otherwise).
func (s *OrderService) findOpen(ctx context.Context, establishmentID, orderID string) (domain.OrderRow, error) {
	order, err := s.find(ctx, establishmentID, orderID)
	if err != nil {
		return domain.OrderRow{}, err
	}
	if order.Status != domain.OrderOpen {
		return domain.OrderRow{}, domain.BadRequest(domain.CodeOrderNotOpen)
	}
	return order, nil
}

// findTable returns the establishment's table, or TABLE_NOT_FOUND.
func (s *OrderService) findTable(ctx context.Context, establishmentID, tableID string) (domain.Table, error) {
	table, err := s.tables.FindByID(ctx, tableID)
	if err != nil {
		return domain.Table{}, err
	}
	if table == nil || table.EstablishmentID != establishmentID {
		return domain.Table{}, domain.NotFound(domain.CodeTableNotFound)
	}
	return *table, nil
}

// priceLines looks up the product of each line (PRODUCT_NOT_FOUND if the establishment does
// not sell one of them) and returns the lines with their product's price, name and tax
// rate, and what they add up to before tax.
func (s *OrderService) priceLines(ctx context.Context, establishmentID string, lines []OrderLineInput) ([]domain.NewOrderItem, int, error) {
	productIDs := make([]string, 0, len(lines))
	for _, line := range lines {
		productIDs = append(productIDs, line.ProductID)
	}

	products, err := s.orders.FindProducts(ctx, establishmentID, productIDs)
	if err != nil {
		return nil, 0, err
	}

	byID := make(map[string]domain.OrderProduct, len(products))
	for _, product := range products {
		byID[product.ID] = product
	}

	items := make([]domain.NewOrderItem, 0, len(lines))
	total := 0
	for _, line := range lines {
		product, ok := byID[line.ProductID]
		if !ok {
			return nil, 0, domain.NotFound(domain.CodeProductNotFound)
		}

		items = append(items, domain.NewOrderItem{
			ProductID:   line.ProductID,
			ProductName: product.Name,
			Quantity:    line.Quantity,
			Price:       product.Price,
			TaxRate:     product.TaxRate,
			Notes:       cutOrderNote(line.Notes),
		})
		total += product.Price * line.Quantity
	}

	return items, total, nil
}

// newOrderAdjustment is the discount to store: the reason cut like the notes, and the line
// only on a discount of a line.
func newOrderAdjustment(input OrderAdjustmentInput) domain.NewOrderAdjustment {
	adjustment := domain.NewOrderAdjustment{
		Target: input.Target,
		Type:   input.Type,
		Value:  input.Value,
		Reason: cutOrderNote(input.Reason),
	}
	if input.Target == domain.AdjustmentItem {
		adjustment.ItemID = input.ItemID
	}
	return adjustment
}

func lineFinalTotal(pricing domain.Pricing, itemID string) int {
	for _, line := range pricing.ItemLines {
		if line.ID == itemID {
			return line.FinalTotal
		}
	}
	return 0
}

func anyOrderAtTable(orders []domain.OrderRow, tableID string) bool {
	for _, order := range orders {
		if order.TableID != nil && *order.TableID == tableID {
			return true
		}
	}
	return false
}

// toOrders maps the rows, never returning nil.
func toOrders(rows []domain.OrderRow) []domain.Order {
	orders := make([]domain.Order, 0, len(rows))
	for _, row := range rows {
		orders = append(orders, row.ToOrder())
	}
	return orders
}

// cutOrderNote is `note?.substring(0, 500) || null`: the first 500 characters, and nil when there
// is no note or it is empty.
func cutOrderNote(note *string) *string {
	if note == nil || *note == "" {
		return nil
	}

	runes := []rune(*note)
	if len(runes) <= orderNoteMaxLength {
		return note
	}

	cut := string(runes[:orderNoteMaxLength])
	return &cut
}

// trimOrderNote is `note.trim() || null`.
func trimOrderNote(note string) *string {
	trimmed := strings.TrimSpace(note)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

// tableIDOrNil is value, or nil when it is nil or "".
func tableIDOrNil(value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	return value
}

// orderDayUTC is midnight (UTC) of the day t falls on in UTC.
func orderDayUTC(t time.Time) time.Time {
	year, month, day := t.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
