package domain

import "time"

type OrderStatus string

const (
	OrderOpen      OrderStatus = "OPEN"
	OrderClosed    OrderStatus = "CLOSED"
	OrderCancelled OrderStatus = "CANCELLED"
)

type PaymentStatus string

const (
	PaymentPending PaymentStatus = "PENDING"
	PaymentPartial PaymentStatus = "PARTIAL"
	PaymentPaid    PaymentStatus = "PAID"
)

type DeliveryStatus string

const (
	DeliveryPending DeliveryStatus = "PENDING"
	DeliveryPartial DeliveryStatus = "PARTIAL"
	DeliveryServed  DeliveryStatus = "SERVED"
)

type PaymentMethod string

const (
	PaymentCash  PaymentMethod = "CASH"
	PaymentCard  PaymentMethod = "CARD"
	PaymentMixed PaymentMethod = "MIXED"
	PaymentNone  PaymentMethod = "NONE"
)

type AdjustmentTarget string

const (
	AdjustmentOrder AdjustmentTarget = "ORDER"
	AdjustmentItem  AdjustmentTarget = "ITEM"
)

type AdjustmentType string

const (
	AdjustmentPercentage  AdjustmentType = "PERCENTAGE"
	AdjustmentFixedAmount AdjustmentType = "FIXED_AMOUNT"
)

const (
	MessageNegativeTotalNotAllowed       = "NEGATIVE_TOTAL_NOT_ALLOWED"
	MessagePayQuantityExceedsTotal       = "PAY_QUANTITY_EXCEEDS_TOTAL"
	MessagePayQuantityCannotBeNegative   = "PAY_QUANTITY_CANNOT_BE_NEGATIVE"
	MessageServeQuantityExceedsTotal     = "SERVE_QUANTITY_EXCEEDS_TOTAL"
	MessageServeQuantityCannotBeNegative = "SERVE_QUANTITY_CANNOT_BE_NEGATIVE"
	MessageCannotDeletePastOrder         = "CANNOT_DELETE_PAST_ORDER"
	MessageCannotDeleteOpenOrder         = "CANNOT_DELETE_OPEN_ORDER"
	MessageTipCannotBeNegative           = "Tip amount cannot be negative"
	MessageItemIDRequiredForItemTarget   = "itemId is required for ITEM target"
	MessageAdjustmentNotFound            = "Adjustment not found"
)

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
		TableID:         NilIfEmpty(row.TableID),
		TableName:       tableName,
		Status:          row.Status,
		TotalAmount:     row.TotalAmount,
		AmountPaidCash:  row.AmountPaidCash,
		AmountPaidCard:  row.AmountPaidCard,
		Items:           items,
		Adjustments:     row.ToAdjustments(),
		PaymentMethod:   row.PaymentMethod,
		Notes:           NilIfEmpty(row.Notes),
		TicketNotes:     NilIfEmpty(row.TicketNotes),
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

func (row OrderRow) ToAdjustments() []OrderAdjustment {
	adjustments := make([]OrderAdjustment, 0, len(row.Adjustments))
	for _, adjustment := range row.Adjustments {
		adjustments = append(adjustments, OrderAdjustment{
			ID:        adjustment.ID,
			OrderID:   adjustment.OrderID,
			Target:    adjustment.Target,
			ItemID:    NilIfEmpty(adjustment.ItemID),
			Type:      adjustment.Type,
			Value:     adjustment.Value,
			Reason:    NilIfEmpty(adjustment.Reason),
			CreatedAt: NewInstant(adjustment.CreatedAt),
		})
	}
	return adjustments
}

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
		Notes:            NilIfEmpty(item.Notes),
		CreatedAt:        NewInstant(item.CreatedAt),
		UpdatedAt:        NewInstant(item.UpdatedAt),
	}
}

func (row OrderRow) FindItem(itemID string) (OrderItemRow, bool) {
	for _, item := range row.Items {
		if item.ID == itemID {
			return item, true
		}
	}
	return OrderItemRow{}, false
}

func (row OrderRow) HasAdjustment(adjustmentID string) bool {
	for _, adjustment := range row.Adjustments {
		if adjustment.ID == adjustmentID {
			return true
		}
	}
	return false
}

func (row OrderRow) ItemsTotal() int {
	total := 0
	for _, item := range row.Items {
		total += item.PriceAtPurchase * item.Quantity
	}
	return total
}

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

type OrderItemPaid struct {
	Quantity int
	Cash     int
	Card     int
	Status   PaymentStatus
	Method   PaymentMethod
}

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

func PercentageOf(amount, percentage int) int {
	return roundJS(float64(amount*percentage) / 100)
}

type OrderProduct struct {
	ID      string
	Name    string
	Price   int
	TaxRate int
}

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

type NewOrderItem struct {
	ProductID   string
	ProductName string
	Quantity    int
	Price       int
	TaxRate     int
	Notes       *string
}

type NewOrderAdjustment struct {
	Target AdjustmentTarget
	Type   AdjustmentType
	Value  int
	Reason *string
	ItemID *string
}

type OrderItemsAddition struct {
	Items       []NewOrderItem
	TotalAmount int
	ChangeNotes bool
	Notes       *string
}

type OrderItemUpdate struct {
	ItemID         string
	PaidQuantity   *int
	ServedQuantity *int
	PaymentMethod  *PaymentMethod
}

type OrderNotesChanges struct {
	ChangeNotes       bool
	Notes             *string
	ChangeTicketNotes bool
	TicketNotes       *string
}

type MergedOrder struct {
	ID      string
	TableID *string
}

type OrderMerge struct {
	PrimaryID        string
	PrimaryTableID   *string
	PrimaryTableName *string
	Sources          []MergedOrder
	TargetTableID    *string
}

type OrderLineInput struct {
	ProductID string
	Quantity  int
	Notes     *string
}

type OrderAdjustmentInput struct {
	Target AdjustmentTarget
	Type   AdjustmentType
	Value  int
	Reason *string
	ItemID *string
}

type CreateOrderInput struct {
	CreatedByID string
	TableID     *string
	Items       []OrderLineInput
	Notes       *string
	Adjustments []OrderAdjustmentInput
	TipAmount   *int
}

type AddOrderItemsInput struct {
	Items      []OrderLineInput
	Notes      *string
	ClearNotes bool
}

type MergeOrdersInput struct {
	OrderIDs      []string
	TargetTableID *string
}

type UpdateOrderNotesInput struct {
	Notes       *string
	TicketNotes *string
}
