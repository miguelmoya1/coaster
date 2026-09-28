package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

const orderNoteMaxLength = 500

type OrderService struct {
	orders ports.OrderRepository
	tables ports.TableRepository
	events ports.EventPublisher
	now    func() time.Time
}

func NewOrderService(orders ports.OrderRepository, tables ports.TableRepository, events ports.EventPublisher) *OrderService {
	return &OrderService{orders: orders, tables: tables, events: events, now: time.Now}
}

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

func (s *OrderService) Get(ctx context.Context, establishmentID, orderID string) (domain.Order, error) {
	order, err := s.find(ctx, establishmentID, orderID)
	if err != nil {
		return domain.Order{}, err
	}
	return order.ToOrder(), nil
}

func (s *OrderService) Create(ctx context.Context, establishmentID string, input domain.CreateOrderInput) error {
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

func (s *OrderService) AddItems(ctx context.Context, establishmentID, orderID string, input domain.AddOrderItemsInput) error {
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

func (s *OrderService) Merge(ctx context.Context, establishmentID string, input domain.MergeOrdersInput) error {
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

func (s *OrderService) UpdateNotes(ctx context.Context, establishmentID, orderID string, input domain.UpdateOrderNotesInput) error {
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

func (s *OrderService) AddAdjustment(ctx context.Context, establishmentID, orderID string, input domain.OrderAdjustmentInput) error {
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

func (s *OrderService) priceLines(ctx context.Context, establishmentID string, lines []domain.OrderLineInput) ([]domain.NewOrderItem, int, error) {
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

func newOrderAdjustment(input domain.OrderAdjustmentInput) domain.NewOrderAdjustment {
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

func toOrders(rows []domain.OrderRow) []domain.Order {
	orders := make([]domain.Order, 0, len(rows))
	for _, row := range rows {
		orders = append(orders, row.ToOrder())
	}
	return orders
}

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

func trimOrderNote(note string) *string {
	trimmed := strings.TrimSpace(note)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func tableIDOrNil(value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	return value
}

func orderDayUTC(t time.Time) time.Time {
	year, month, day := t.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
