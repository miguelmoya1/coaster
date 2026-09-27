package service

import (
	"context"
	"regexp"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// isoDate is ISO_DATE of order.tools.ts.
var isoDate = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// The inputs of the order tools (order.tools.ts).

type getOrderDetailsInput struct {
	OrderID string `json:"orderId" jsonschema_description:"The UUID of the order to inspect."`
}

type getOrdersByDateInput struct {
	Date string `json:"date" jsonschema_description:"The day to look up, formatted as YYYY-MM-DD."`
}

type createOrderInput struct {
	TableID string                 `json:"tableId" jsonschema_description:"The UUID of the table where this new order is placed. Look up the user-specified table name (e.g. \"Mesa 2\") in the list of available tables to find its UUID."`
	Items   []createOrderLineInput `json:"items" jsonschema_description:"List of exact product UUIDs and their quantities."`
}

type createOrderLineInput struct {
	ProductID string `json:"productId" jsonschema_description:"The UUID of the product. Match the food/drink name requested (e.g. \"cerveza\", \"café\", \"bocadillo\") against the available products list to get its UUID."`
	Quantity  int    `json:"quantity" jsonschema:"minimum=1,maximum=9007199254740991" jsonschema_description:"The quantity of the item. Match natural numbers or word numbers, e.g. \"tres cañas\" -> 3. Defaults to 1 if not specified."`
}

type addOrderItemsInput struct {
	OrderID string              `json:"orderId" jsonschema_description:"The UUID of the existing open order to add items to. Look up the active open orders list to find the order UUID matching the requested table or order details."`
	Items   []addOrderLineInput `json:"items" jsonschema_description:"List of product UUIDs and their quantities."`
}

type addOrderLineInput struct {
	ProductID string `json:"productId" jsonschema_description:"The UUID of the product. Match the food/drink name requested (e.g. \"cerveza\", \"café\", \"bocadillo\") against the available products list to get its UUID."`
	Quantity  int    `json:"quantity" jsonschema:"minimum=1,maximum=9007199254740991" jsonschema_description:"The quantity of the item to add. Match natural numbers or word numbers, e.g. \"tres cañas\" -> 3. Defaults to 1 if not specified."`
}

type checkoutOrderInput struct {
	OrderID       string `json:"orderId" jsonschema_description:"The UUID of the open order to check out. Look up the active open orders list to find the order UUID matching the table or order details."`
	PaymentMethod string `json:"paymentMethod" jsonschema:"enum=CASH,enum=CARD" jsonschema_description:"Payment method: CASH (efectivo, caja) or CARD (tarjeta, datáfono). Defaults to CASH if not specified."`
}

type serveOrPayItemsInput struct {
	OrderID string                `json:"orderId" jsonschema_description:"The UUID of the order to update."`
	Items   []serveOrPayItemInput `json:"items" jsonschema_description:"List of order items to update."`
}

type serveOrPayItemInput struct {
	ItemID         string  `json:"itemId" jsonschema_description:"The UUID of the order item to update (OrderItemId). Find this item ID inside the items list of the specified order in the active open orders list."`
	ServedQuantity *int    `json:"servedQuantity,omitempty" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"The new total quantity of this item that has been prepared/served. Use this when the user says \"saca X cañas\" or \"sirve la mesa\"."`
	PaidQuantity   *int    `json:"paidQuantity,omitempty" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"The new total quantity of this item that has been paid."`
	PaymentMethod  *string `json:"paymentMethod,omitempty" jsonschema:"enum=CASH,enum=CARD,enum=NONE" jsonschema_description:"Payment method used if paying."`
}

type moveOrderTableInput struct {
	OrderID string `json:"orderId" jsonschema_description:"The UUID of the order to move."`
	TableID string `json:"tableId" jsonschema_description:"The UUID of the destination table."`
}

type mergeOrdersInput struct {
	OrderIDs      []string `json:"orderIds" jsonschema:"minItems=2" jsonschema_description:"The UUIDs of the orders to merge. At least two are required."`
	TargetTableID *string  `json:"targetTableId,omitempty" jsonschema_description:"Optional UUID of the table the merged order should end up at."`
}

type updateOrderTipInput struct {
	OrderID string  `json:"orderId" jsonschema_description:"The UUID of the order."`
	Tip     float64 `json:"tip" jsonschema:"minimum=0" jsonschema_description:"The tip amount in Euros, e.g. 2.50. Use 0 to remove the tip."`
}

type applyOrderDiscountInput struct {
	OrderID string  `json:"orderId" jsonschema_description:"The UUID of the order to discount."`
	Target  string  `json:"target" jsonschema:"enum=ORDER,enum=ITEM" jsonschema_description:"ORDER discounts the full order, ITEM discounts a single line of the order."`
	ItemID  *string `json:"itemId,omitempty" jsonschema_description:"The UUID of the order item. Required when target is ITEM."`
	Type    string  `json:"type" jsonschema:"enum=PERCENTAGE,enum=FIXED_AMOUNT" jsonschema_description:"PERCENTAGE for \"un 10% de descuento\", FIXED_AMOUNT for \"quítale 2 euros\"."`
	Value   float64 `json:"value" jsonschema:"minimum=0" jsonschema_description:"The percentage (1-100) when type is PERCENTAGE, or the amount in Euros when FIXED_AMOUNT."`
	Reason  *string `json:"reason,omitempty" jsonschema_description:"Short reason for the discount, e.g. \"invitación\" or \"queja\"."`
}

type removeOrderDiscountInput struct {
	OrderID      string `json:"orderId" jsonschema_description:"The UUID of the order."`
	AdjustmentID string `json:"adjustmentId" jsonschema_description:"The UUID of the adjustment (discount) to remove."`
}

type removeOrderItemInput struct {
	OrderID   string `json:"orderId" jsonschema_description:"The UUID of the order."`
	ItemID    string `json:"itemId" jsonschema_description:"The UUID of the order item to remove."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the removal in a previous turn."`
}

type cancelOrderInput struct {
	OrderID   string `json:"orderId" jsonschema_description:"The UUID of the order to cancel. Find the order UUID in the active open orders list."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the cancellation in a previous turn."`
}

type deleteOrderInput struct {
	OrderID   string `json:"orderId" jsonschema_description:"The UUID of the order to delete."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the deletion in a previous turn."`
}

// aiOrder is summarizeOrder: an order as the model reads it, with money in euros.
type aiOrder struct {
	ID      string             `json:"id"`
	Table   string             `json:"table"`
	Status  domain.OrderStatus `json:"status"`
	Total   float64            `json:"total"`
	Pending float64            `json:"pending"`
	Items   []aiOrderItem      `json:"items"`
}

type aiOrderItem struct {
	ItemID   string `json:"itemId"`
	Product  string `json:"product"`
	Quantity int    `json:"quantity"`
	Served   int    `json:"served"`
	Paid     int    `json:"paid"`
}

// aiOrderDetails is what getOrderDetails adds to the summary.
type aiOrderDetails struct {
	aiOrder
	Tip         float64             `json:"tip"`
	PaidCash    float64             `json:"paidCash"`
	PaidCard    float64             `json:"paidCard"`
	Adjustments []aiOrderAdjustment `json:"adjustments"`
}

// aiOrderAdjustment is a discount: a percentage stays as it is, an amount goes in euros.
type aiOrderAdjustment struct {
	AdjustmentID string                  `json:"adjustmentId"`
	Target       domain.AdjustmentTarget `json:"target"`
	Type         domain.AdjustmentType   `json:"type"`
	Value        float64                 `json:"value"`
	Reason       *string                 `json:"reason,omitempty"`
}

// aiOrdersOfDay is what getOrdersByDate answers.
type aiOrdersOfDay struct {
	Count   int       `json:"count"`
	Revenue float64   `json:"revenue"`
	Orders  []aiOrder `json:"orders"`
}

// summarizeOrder names the table and the products from the snapshot of the turn.
func (tc *aiToolContext) summarizeOrder(order domain.Order) aiOrder {
	items := make([]aiOrderItem, 0, len(order.Items))
	for _, item := range order.Items {
		items = append(items, aiOrderItem{
			ItemID:   item.ID,
			Product:  productNameIn(tc.products, item.ProductID),
			Quantity: item.Quantity,
			Served:   item.ServedQuantity,
			Paid:     item.PaidQuantity,
		})
	}

	return aiOrder{
		ID:      order.ID,
		Table:   tableNameIn(tc.tables, order.TableID),
		Status:  order.Status,
		Total:   toEuros(order.OrderTotal),
		Pending: toEuros(order.PayableTotal - order.AmountPaidCash - order.AmountPaidCard),
		Items:   items,
	}
}

func (tc *aiToolContext) summarizeOrders(orders []domain.Order) []aiOrder {
	summaries := make([]aiOrder, 0, len(orders))
	for _, order := range orders {
		summaries = append(summaries, tc.summarizeOrder(order))
	}
	return summaries
}

// tableNameOfOpenOrder is the table of an open order of the snapshot, for the confirmations.
func (tc *aiToolContext) tableNameOfOpenOrder(orderID string) string {
	for _, order := range tc.openOrders {
		if order.ID == orderID {
			return tableNameIn(tc.tables, order.TableID)
		}
	}
	return "No table"
}

// knownProductLines keeps the lines whose product is in the snapshot.
func (tc *aiToolContext) knownProductLines(lines []OrderLineInput) []OrderLineInput {
	var known []OrderLineInput
	for _, line := range lines {
		for _, product := range tc.products {
			if product.ID == line.ProductID {
				known = append(known, line)
				break
			}
		}
	}
	return known
}

const noKnownProducts = "None of the requested products are available in this establishment's menu."

func (s *AIService) orderTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listOpenOrders",
			"List the currently open orders with their items, served/paid quantities and totals in euros. Use it to refresh the order list before acting on it.",
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewOrders,
					func() ([]domain.Order, error) { return s.orders.List(ctx, tc.establishmentID, domain.OrderOpen) },
					func(orders []domain.Order) any { return tc.summarizeOrders(orders) })
			}),

		newAITool("getOrderDetails",
			"Get the full detail of a single order: items, item UUIDs, served and paid quantities, discounts, tip and totals in euros.",
			func(ctx context.Context, input getOrderDetailsInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewOrders,
					func() (domain.Order, error) { return s.orders.Get(ctx, tc.establishmentID, input.OrderID) },
					func(order domain.Order) any {
						adjustments := make([]aiOrderAdjustment, 0, len(order.Adjustments))
						for _, adjustment := range order.Adjustments {
							value := toEuros(adjustment.Value)
							if adjustment.Type == domain.AdjustmentPercentage {
								value = float64(adjustment.Value)
							}
							adjustments = append(adjustments, aiOrderAdjustment{
								AdjustmentID: adjustment.ID,
								Target:       adjustment.Target,
								Type:         adjustment.Type,
								Value:        value,
								Reason:       adjustment.Reason,
							})
						}

						return aiOrderDetails{
							aiOrder:     tc.summarizeOrder(order),
							Tip:         toEuros(order.TipAmount),
							PaidCash:    toEuros(order.AmountPaidCash),
							PaidCard:    toEuros(order.AmountPaidCard),
							Adjustments: adjustments,
						}
					})
			}),

		newAITool("getOrdersByDate",
			"List every order of a given day (closed, cancelled and open) to answer questions about past activity, such as what was sold yesterday.",
			func(ctx context.Context, input getOrdersByDateInput) domain.AIToolResult {
				if !isoDate.MatchString(input.Date) {
					return aiFailed("The date must be formatted as YYYY-MM-DD.")
				}

				return aiQuery(tc, domain.PermissionViewOrders,
					func() ([]domain.Order, error) { return s.orders.ListByDate(ctx, tc.establishmentID, input.Date) },
					func(orders []domain.Order) any {
						revenue := 0
						for _, order := range orders {
							if order.Status == domain.OrderClosed {
								revenue += order.TotalAmount
							}
						}
						return aiOrdersOfDay{Count: len(orders), Revenue: toEuros(revenue), Orders: tc.summarizeOrders(orders)}
					})
			}),

		newAITool("createOrder", "Create a new open order for a specific table in the establishment.",
			func(ctx context.Context, input createOrderInput) domain.AIToolResult {
				lines := make([]OrderLineInput, 0, len(input.Items))
				for _, item := range input.Items {
					lines = append(lines, OrderLineInput{ProductID: item.ProductID, Quantity: item.Quantity})
				}

				known := tc.knownProductLines(lines)
				if len(known) == 0 {
					return aiFailed(noKnownProducts)
				}

				return tc.execute(domain.PermissionCreateOrder, nil, func() error {
					return s.orders.Create(ctx, tc.establishmentID, CreateOrderInput{
						CreatedByID: tc.user.ID,
						TableID:     optionalID(&input.TableID),
						Items:       known,
					})
				})
			}),

		newAITool("addOrderItems", "Add more items to an existing open order.",
			func(ctx context.Context, input addOrderItemsInput) domain.AIToolResult {
				lines := make([]OrderLineInput, 0, len(input.Items))
				for _, item := range input.Items {
					lines = append(lines, OrderLineInput{ProductID: item.ProductID, Quantity: item.Quantity})
				}

				known := tc.knownProductLines(lines)
				if len(known) == 0 {
					return aiFailed(noKnownProducts)
				}

				return tc.execute(domain.PermissionUpdateOrder, nil, func() error {
					return s.orders.AddItems(ctx, tc.establishmentID, input.OrderID, AddOrderItemsInput{Items: known})
				})
			}),

		newAITool("checkoutOrder", "Collect payment and close an open order.",
			func(ctx context.Context, input checkoutOrderInput) domain.AIToolResult {
				return tc.execute(domain.PermissionCheckoutOrder, nil, func() error {
					return s.orders.Checkout(ctx, tc.establishmentID, input.OrderID, domain.PaymentMethod(input.PaymentMethod))
				})
			}),

		newAITool("serveOrPayItems", "Update the preparation (served) or payment status of items in an open order.",
			func(ctx context.Context, input serveOrPayItemsInput) domain.AIToolResult {
				updates := make([]domain.OrderItemUpdate, 0, len(input.Items))
				for _, item := range input.Items {
					update := domain.OrderItemUpdate{
						ItemID:         item.ItemID,
						ServedQuantity: item.ServedQuantity,
						PaidQuantity:   item.PaidQuantity,
					}
					if item.PaymentMethod != nil {
						method := domain.PaymentMethod(*item.PaymentMethod)
						update.PaymentMethod = &method
					}
					updates = append(updates, update)
				}

				return tc.execute(domain.PermissionUpdateOrder, nil, func() error {
					return s.orders.BulkUpdate(ctx, tc.establishmentID, input.OrderID, updates)
				})
			}),

		newAITool("moveOrderTable", "Move an open order to a different table, e.g. when a group changes seats.",
			func(ctx context.Context, input moveOrderTableInput) domain.AIToolResult {
				return tc.execute(domain.PermissionMoveOrderTable, nil, func() error {
					return s.orders.MoveTable(ctx, tc.establishmentID, input.OrderID, input.TableID)
				})
			}),

		newAITool("mergeOrders", "Merge two or more open orders into a single one, e.g. when two tables want to pay together.",
			func(ctx context.Context, input mergeOrdersInput) domain.AIToolResult {
				return tc.execute(domain.PermissionMergeOrders, nil, func() error {
					return s.orders.Merge(ctx, tc.establishmentID, MergeOrdersInput{
						OrderIDs:      input.OrderIDs,
						TargetTableID: optionalID(input.TargetTableID),
					})
				})
			}),

		newAITool("updateOrderTip", "Set the tip of an open order. The tip replaces any previous tip on that order.",
			func(ctx context.Context, input updateOrderTipInput) domain.AIToolResult {
				return tc.execute(domain.PermissionUpdateOrder, nil, func() error {
					return s.orders.UpdateTip(ctx, tc.establishmentID, input.OrderID, toCents(input.Tip))
				})
			}),

		newAITool("applyOrderDiscount",
			"Apply a discount to a whole order or to one of its items, either as a percentage or as a fixed amount in Euros.",
			func(ctx context.Context, input applyOrderDiscountInput) domain.AIToolResult {
				target := domain.AdjustmentTarget(input.Target)
				adjustmentType := domain.AdjustmentType(input.Type)

				if target == domain.AdjustmentItem && optionalID(input.ItemID) == nil {
					return aiFailed("An itemId is required to discount a single order item.")
				}
				if adjustmentType == domain.AdjustmentPercentage && (input.Value < 1 || input.Value > 100) {
					return aiFailed("A percentage discount must be between 1 and 100.")
				}

				value := toCents(input.Value)
				if adjustmentType == domain.AdjustmentPercentage {
					value = mathRound(input.Value)
				}

				return tc.execute(domain.PermissionUpdateOrder, nil, func() error {
					return s.orders.AddAdjustment(ctx, tc.establishmentID, input.OrderID, OrderAdjustmentInput{
						Target: target,
						Type:   adjustmentType,
						Value:  value,
						ItemID: optionalID(input.ItemID),
						Reason: input.Reason,
					})
				})
			}),

		newAITool("removeOrderDiscount",
			"Remove a discount previously applied to an order. Use getOrderDetails to find the adjustment UUID.",
			func(ctx context.Context, input removeOrderDiscountInput) domain.AIToolResult {
				return tc.execute(domain.PermissionUpdateOrder, nil, func() error {
					return s.orders.RemoveAdjustment(ctx, tc.establishmentID, input.OrderID, input.AdjustmentID)
				})
			}),

		newAITool("removeOrderItem",
			"Remove a single item line from an open order, e.g. when a drink was added by mistake. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input removeOrderItemInput) domain.AIToolResult {
				confirmation := &aiConfirmation{summary: "remove that item from the order", confirmed: input.Confirmed}
				return tc.execute(domain.PermissionDeleteOrderItem, confirmation, func() error {
					return s.orders.RemoveItem(ctx, tc.establishmentID, input.OrderID, input.ItemID)
				})
			}),

		newAITool("cancelOrder", "Cancel an open order without charging it. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input cancelOrderInput) domain.AIToolResult {
				confirmation := &aiConfirmation{
					summary:   `cancel the order of table "` + tc.tableNameOfOpenOrder(input.OrderID) + `"`,
					confirmed: input.Confirmed,
				}
				return tc.execute(domain.PermissionCancelOrder, confirmation, func() error {
					return s.orders.Cancel(ctx, tc.establishmentID, input.OrderID)
				})
			}),

		newAITool("deleteOrder",
			"Permanently delete an order and all its history. Destructive: requires the user to confirm first. Prefer cancelOrder unless the user really wants it gone.",
			func(ctx context.Context, input deleteOrderInput) domain.AIToolResult {
				confirmation := &aiConfirmation{
					summary:   `permanently delete the order of table "` + tc.tableNameOfOpenOrder(input.OrderID) + `"`,
					confirmed: input.Confirmed,
				}
				return tc.execute(domain.PermissionDeleteOrder, confirmation, func() error {
					return s.orders.Delete(ctx, tc.establishmentID, input.OrderID)
				})
			}),
	}
}
