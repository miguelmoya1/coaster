package domain

import "time"

// OrderStatus is OrderStatus in @coaster/common.
type OrderStatus string

const (
	OrderOpen      OrderStatus = "OPEN"
	OrderClosed    OrderStatus = "CLOSED"
	OrderCancelled OrderStatus = "CANCELLED"
)

// PaymentStatus is PaymentStatus in @coaster/common: how much of an order line is paid.
type PaymentStatus string

const (
	PaymentPending PaymentStatus = "PENDING"
	PaymentPartial PaymentStatus = "PARTIAL"
	PaymentPaid    PaymentStatus = "PAID"
)

// DeliveryStatus is DeliveryStatus in @coaster/common: how much of an order line is served.
type DeliveryStatus string

const (
	DeliveryPending DeliveryStatus = "PENDING"
	DeliveryPartial DeliveryStatus = "PARTIAL"
	DeliveryServed  DeliveryStatus = "SERVED"
)

// PaymentMethod is PaymentMethod in @coaster/common.
type PaymentMethod string

const (
	PaymentCash  PaymentMethod = "CASH"
	PaymentCard  PaymentMethod = "CARD"
	PaymentMixed PaymentMethod = "MIXED"
	PaymentNone  PaymentMethod = "NONE"
)

// AdjustmentTarget is AdjustmentTarget in @coaster/common: a discount on the whole order
// or on one of its lines.
type AdjustmentTarget string

const (
	AdjustmentOrder AdjustmentTarget = "ORDER"
	AdjustmentItem  AdjustmentTarget = "ITEM"
)

// AdjustmentType is AdjustmentType in @coaster/common. A PERCENTAGE value is a whole
// percentage (10 is 10 %); a FIXED_AMOUNT value is in cents.
type AdjustmentType string

const (
	AdjustmentPercentage  AdjustmentType = "PERCENTAGE"
	AdjustmentFixedAmount AdjustmentType = "FIXED_AMOUNT"
)

// Messages Nest sends as they are, because @coaster/common has no code for them.
const (
	MessageNegativeTotalNotAllowed       = "NEGATIVE_TOTAL_NOT_ALLOWED"
	MessagePayQuantityExceedsTotal       = "PAY_QUANTITY_EXCEEDS_TOTAL"
	MessagePayQuantityCannotBeNegative   = "PAY_QUANTITY_CANNOT_BE_NEGATIVE"
	MessageServeQuantityExceedsTotal     = "SERVE_QUANTITY_EXCEEDS_TOTAL"
	MessageServeQuantityCannotBeNegative = "SERVE_QUANTITY_CANNOT_BE_NEGATIVE"
	MessageCannotDeletePastOrder         = "CANNOT_DELETE_PAST_ORDER"
	MessageTipCannotBeNegative           = "Tip amount cannot be negative"
	MessageItemIDRequiredForItemTarget   = "itemId is required for ITEM target"
	MessageAdjustmentNotFound            = "Adjustment not found"
)

// Order is an order as the API sends it (Order in @coaster/common). The fields and their
// order are those of OrdersMapper.toDomain; the totals come from CalculatePricing.
type Order struct {
	ID              string            `json:"id"`
	EstablishmentID string            `json:"establishmentId"`
	TableID         *string           `json:"tableId,omitempty"`
	TableName       *string           `json:"tableName,omitempty"`
	Status          OrderStatus       `json:"status"`
	TotalAmount     int               `json:"totalAmount"`
	AmountPaidCash  int               `json:"amountPaidCash"`
	AmountPaidCard  int               `json:"amountPaidCard"`
	Items           []OrderItem       `json:"items"`
	Adjustments     []OrderAdjustment `json:"adjustments"`
	PaymentMethod   PaymentMethod     `json:"paymentMethod"`
	Notes           *string           `json:"notes,omitempty"`
	TicketNotes     *string           `json:"ticketNotes,omitempty"`
	TipAmount       int               `json:"tipAmount"`
	NetTotal        int               `json:"netTotal"`
	TaxBreakdown    []TaxLine         `json:"taxBreakdown"`
	TaxAmountTotal  int               `json:"taxAmountTotal"`
	OrderTotal      int               `json:"orderTotal"`
	PayableTotal    int               `json:"payableTotal"`
	CreatedAt       Instant           `json:"createdAt"`
	UpdatedAt       Instant           `json:"updatedAt"`
}

// OrderItem is a line of an order (OrderItem in @coaster/common). ProductName is the
// product's name today, not the one it had when it was ordered.
type OrderItem struct {
	ID               string         `json:"id"`
	OrderID          string         `json:"orderId"`
	ProductID        string         `json:"productId"`
	ProductName      string         `json:"productName"`
	Quantity         int            `json:"quantity"`
	PriceAtPurchase  int            `json:"priceAtPurchase"`
	PaidQuantity     int            `json:"paidQuantity"`
	PaidQuantityCash int            `json:"paidQuantityCash"`
	PaidQuantityCard int            `json:"paidQuantityCard"`
	ServedQuantity   int            `json:"servedQuantity"`
	PaymentStatus    PaymentStatus  `json:"paymentStatus"`
	DeliveryStatus   DeliveryStatus `json:"deliveryStatus"`
	PaymentMethod    PaymentMethod  `json:"paymentMethod"`
	Notes            *string        `json:"notes,omitempty"`
	CreatedAt        Instant        `json:"createdAt"`
	UpdatedAt        Instant        `json:"updatedAt"`
}

// OrderAdjustment is a discount on an order or on one of its lines (OrderAdjustment in
// @coaster/common).
type OrderAdjustment struct {
	ID        string           `json:"id"`
	OrderID   string           `json:"orderId"`
	Target    AdjustmentTarget `json:"target"`
	ItemID    *string          `json:"itemId,omitempty"`
	Type      AdjustmentType   `json:"type"`
	Value     int              `json:"value"`
	Reason    *string          `json:"reason,omitempty"`
	CreatedAt Instant          `json:"createdAt"`
}

// OrderRow is an order as it is stored, with its lines (oldest first) and its discounts.
// TableName is the name kept on the order and LinkedTableName the current name of the
// table it points to.
type OrderRow struct {
	ID              string
	EstablishmentID string
	TableID         *string
	TableName       *string
	LinkedTableName *string
	Status          OrderStatus
	TotalAmount     int
	AmountPaidCash  int
	AmountPaidCard  int
	PaymentMethod   PaymentMethod
	Notes           *string
	TicketNotes     *string
	TipAmount       int
	CashCloseID     *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Items           []OrderItemRow
	Adjustments     []OrderAdjustmentRow
}

// OrderItemRow is a line as it is stored, with the current name of its product.
type OrderItemRow struct {
	ID                string
	OrderID           string
	ProductID         string
	ProductName       string
	Quantity          int
	PriceAtPurchase   int
	TaxRateAtPurchase int
	PaidQuantity      int
	PaidQuantityCash  int
	PaidQuantityCard  int
	ServedQuantity    int
	PaymentStatus     PaymentStatus
	DeliveryStatus    DeliveryStatus
	PaymentMethod     PaymentMethod
	Notes             *string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// OrderAdjustmentRow is a discount as it is stored.
type OrderAdjustmentRow struct {
	ID        string
	OrderID   string
	Target    AdjustmentTarget
	ItemID    *string
	Type      AdjustmentType
	Value     int
	Reason    *string
	CreatedAt time.Time
}

// Pricing is what CalculatePricing says the order's totals are.
func (row OrderRow) Pricing() Pricing {
	input := PricingInput{
		TipAmount:      row.TipAmount,
		AmountPaidCash: row.AmountPaidCash,
		AmountPaidCard: row.AmountPaidCard,
	}

	for _, item := range row.Items {
		input.Items = append(input.Items, PricingItem{
			ID:              item.ID,
			PriceAtPurchase: item.PriceAtPurchase,
			Quantity:        item.Quantity,
			PaidQuantity:    item.PaidQuantity,
			TaxRate:         item.TaxRateAtPurchase,
		})
	}

	for _, adjustment := range row.Adjustments {
		input.Adjustments = append(input.Adjustments, PricingAdjustment{
			ID:     adjustment.ID,
			Target: adjustment.Target,
			Type:   adjustment.Type,
			Value:  adjustment.Value,
			ItemID: adjustment.ItemID,
		})
	}

	return CalculatePricing(input)
}

// ToOrder is OrdersMapper.toDomain. The table name is the one kept on the order or, without
// one, the name of its table; empty notes are left out.
func (row OrderRow) ToOrder() Order {
	pricing := row.Pricing()

	tableName := row.TableName
	if tableName == nil {
		tableName = row.LinkedTableName
	}

	items := make([]OrderItem, 0, len(row.Items))
	for _, item := range row.Items {
		items = append(items, item.ToOrderItem())
	}

	return Order{
		ID:              row.ID,
		EstablishmentID: row.EstablishmentID,
		TableID:         nonEmpty(row.TableID),
		TableName:       tableName,
		Status:          row.Status,
		TotalAmount:     row.TotalAmount,
		AmountPaidCash:  row.AmountPaidCash,
		AmountPaidCard:  row.AmountPaidCard,
		Items:           items,
		Adjustments:     row.ToAdjustments(),
		PaymentMethod:   row.PaymentMethod,
		Notes:           nonEmpty(row.Notes),
		TicketNotes:     nonEmpty(row.TicketNotes),
		TipAmount:       row.TipAmount,
		NetTotal:        pricing.NetTotal,
		TaxBreakdown:    pricing.TaxBreakdown,
		TaxAmountTotal:  pricing.TaxAmountTotal,
		OrderTotal:      pricing.OrderTotal,
		PayableTotal:    pricing.PayableTotal,
		CreatedAt:       NewInstant(row.CreatedAt),
		UpdatedAt:       NewInstant(row.UpdatedAt),
	}
}

// ToAdjustments is the order's discounts as the API sends them (never nil).
func (row OrderRow) ToAdjustments() []OrderAdjustment {
	adjustments := make([]OrderAdjustment, 0, len(row.Adjustments))
	for _, adjustment := range row.Adjustments {
		adjustments = append(adjustments, OrderAdjustment{
			ID:        adjustment.ID,
			OrderID:   adjustment.OrderID,
			Target:    adjustment.Target,
			ItemID:    nonEmpty(adjustment.ItemID),
			Type:      adjustment.Type,
			Value:     adjustment.Value,
			Reason:    nonEmpty(adjustment.Reason),
			CreatedAt: NewInstant(adjustment.CreatedAt),
		})
	}
	return adjustments
}

// ToOrderItem is OrdersMapper.itemToDomain.
func (item OrderItemRow) ToOrderItem() OrderItem {
	return OrderItem{
		ID:               item.ID,
		OrderID:          item.OrderID,
		ProductID:        item.ProductID,
		ProductName:      item.ProductName,
		Quantity:         item.Quantity,
		PriceAtPurchase:  item.PriceAtPurchase,
		PaidQuantity:     item.PaidQuantity,
		PaidQuantityCash: item.PaidQuantityCash,
		PaidQuantityCard: item.PaidQuantityCard,
		ServedQuantity:   item.ServedQuantity,
		PaymentStatus:    item.PaymentStatus,
		DeliveryStatus:   item.DeliveryStatus,
		PaymentMethod:    item.PaymentMethod,
		Notes:            nonEmpty(item.Notes),
		CreatedAt:        NewInstant(item.CreatedAt),
		UpdatedAt:        NewInstant(item.UpdatedAt),
	}
}

// FindItem returns the line with this id.
func (row OrderRow) FindItem(itemID string) (OrderItemRow, bool) {
	for _, item := range row.Items {
		if item.ID == itemID {
			return item, true
		}
	}
	return OrderItemRow{}, false
}

// HasAdjustment reports whether the order has the discount with this id.
func (row OrderRow) HasAdjustment(adjustmentID string) bool {
	for _, adjustment := range row.Adjustments {
		if adjustment.ID == adjustmentID {
			return true
		}
	}
	return false
}

// ItemsTotal is the order's totalAmount: each line's net price times its quantity, before
// discounts and tax.
func (row OrderRow) ItemsTotal() int {
	total := 0
	for _, item := range row.Items {
		total += item.PriceAtPurchase * item.Quantity
	}
	return total
}

// AmountsPaidByLine is what the bulk update says the order has taken: the paid units of
// each line at the line's price with discounts and tax, in cash and by card.
func (row OrderRow) AmountsPaidByLine() (cash, card int) {
	pricing := row.Pricing()

	for i, item := range row.Items {
		if item.Quantity <= 0 {
			continue
		}
		unitPrice := float64(pricing.ItemLines[i].GrossTotal) / float64(item.Quantity)
		cash += roundJS(unitPrice * float64(item.PaidQuantityCash))
		card += roundJS(unitPrice * float64(item.PaidQuantityCard))
	}

	return cash, card
}

// AmountsAfterCheckout is what the order has taken once the checkout charges what is still
// pending: by card if the method is CARD and in cash otherwise.
func (row OrderRow) AmountsAfterCheckout(method PaymentMethod) (cash, card int) {
	pending := row.Pricing().PendingAmount

	cash, card = row.AmountPaidCash, row.AmountPaidCard
	if method == PaymentCard {
		card += pending
	} else {
		cash += pending
	}

	return cash, card
}

// OrderItemPaid is how many units of a line are paid, and how.
type OrderItemPaid struct {
	Quantity int
	Cash     int
	Card     int
	Status   PaymentStatus
	Method   PaymentMethod
}

// PaidAfter is the line once paidQuantity of its units are paid, as the bulk update writes
// it. Units paid now go to card if method is CARD and to cash otherwise; units given back
// come off card first and then off cash.
func (item OrderItemRow) PaidAfter(paidQuantity int, method *PaymentMethod) OrderItemPaid {
	card, cash := item.PaidQuantityCard, item.PaidQuantityCash

	diff := paidQuantity - item.PaidQuantity
	if diff > 0 {
		if method != nil && *method == PaymentCard {
			card += diff
		} else {
			cash += diff
		}
	} else if diff < 0 {
		givenBack := -diff
		fromCard := min(card, givenBack)
		card -= fromCard
		cash = max(0, cash-(givenBack-fromCard))
	}

	status := PaymentPartial
	switch paidQuantity {
	case item.Quantity:
		status = PaymentPaid
	case 0:
		status = PaymentPending
	}

	return OrderItemPaid{Quantity: paidQuantity, Cash: cash, Card: card, Status: status, Method: PaymentMethodFor(cash, card)}
}

// PaidInFull is the line once the checkout charges its unpaid units: by card if method is
// CARD and in cash otherwise.
func (item OrderItemRow) PaidInFull(method PaymentMethod) OrderItemPaid {
	unpaid := item.Quantity - item.PaidQuantity

	card, cash := item.PaidQuantityCard, item.PaidQuantityCash
	if method == PaymentCard {
		card += unpaid
	} else {
		cash += unpaid
	}

	return OrderItemPaid{Quantity: item.Quantity, Cash: cash, Card: card, Status: PaymentPaid, Method: PaymentMethodFor(cash, card)}
}

// ServedAfter is the delivery status of the line once servedQuantity of its units are served.
func (item OrderItemRow) ServedAfter(servedQuantity int) DeliveryStatus {
	switch servedQuantity {
	case item.Quantity:
		return DeliveryServed
	case 0:
		return DeliveryPending
	default:
		return DeliveryPartial
	}
}

// PaymentMethodFor is paymentMethodFor: how something was paid, from what went in cash and
// what went by card.
func PaymentMethodFor(cash, card int) PaymentMethod {
	switch {
	case cash > 0 && card > 0:
		return PaymentMixed
	case card > 0:
		return PaymentCard
	case cash > 0:
		return PaymentCash
	default:
		return PaymentNone
	}
}

// PercentageOf is percentage % of amount, rounded like Math.round.
func PercentageOf(amount, percentage int) int {
	return roundJS(float64(amount*percentage) / 100)
}

// OrderProduct is what a line copies from its product when it is ordered: the price, the
// name and the tax rate, already resolved.
type OrderProduct struct {
	ID      string
	Name    string
	Price   int
	TaxRate int
}

// NewOrder is an order to open. Its lines already carry their product's details.
type NewOrder struct {
	EstablishmentID string
	CreatedByID     *string
	TableID         *string
	TableName       *string
	TotalAmount     int
	Items           []NewOrderItem
	Adjustments     []NewOrderAdjustment
	TipAmount       int
	Notes           *string
}

// NewOrderItem is a line to add to an order.
type NewOrderItem struct {
	ProductID   string
	ProductName string
	Quantity    int
	Price       int
	TaxRate     int
	Notes       *string
}

// NewOrderAdjustment is a discount to add to an order.
type NewOrderAdjustment struct {
	Target AdjustmentTarget
	Type   AdjustmentType
	Value  int
	Reason *string
	ItemID *string
}

// OrderItemsAddition is the lines to add to an open order and its new totalAmount. With
// ChangeNotes the order's notes become Notes (nil empties them).
type OrderItemsAddition struct {
	Items       []NewOrderItem
	TotalAmount int
	ChangeNotes bool
	Notes       *string
}

// OrderItemUpdate is one line of a bulk update (BulkUpdateItemDto): how many of its units
// are paid, and how, and how many are served. A nil field is left as it is.
type OrderItemUpdate struct {
	ItemID         string
	PaidQuantity   *int
	ServedQuantity *int
	PaymentMethod  *PaymentMethod
}

// OrderNotesChanges says which notes of an order change. A nil value empties them.
type OrderNotesChanges struct {
	ChangeNotes       bool
	Notes             *string
	ChangeTicketNotes bool
	TicketNotes       *string
}

// MergedOrder is an order merged into another one, with the table it had.
type MergedOrder struct {
	ID      string
	TableID *string
}

// OrderMerge is what merging orders needs: the order that stays (the oldest one), the ones
// that go into it and, optionally, the table it ends up at.
type OrderMerge struct {
	PrimaryID        string
	PrimaryTableID   *string
	PrimaryTableName *string
	Sources          []MergedOrder
	TargetTableID    *string
}

// nonEmpty is value, or nil when it is nil or "" (the `|| undefined` of the mappers).
func nonEmpty(value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	return value
}
