package domain

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
