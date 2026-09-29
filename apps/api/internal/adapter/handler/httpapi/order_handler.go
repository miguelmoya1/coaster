package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type OrderHandler struct {
	orders ports.OrderService
}

func NewOrderHandler(orders ports.OrderService) *OrderHandler {
	return &OrderHandler{orders: orders}
}

func (h *OrderHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	orders := middleware.Modules(domain.ModuleOrders)
	const base = "/establishments/{establishmentId}/orders"

	handle(mux, guard, "GET "+base, h.list,
		middleware.Permissions(domain.PermissionViewOrders), orders)
	handle(mux, guard, "GET "+base+"/{orderId}", h.get,
		middleware.Permissions(domain.PermissionViewOrders), orders)
	handle(mux, guard, "POST "+base, h.create,
		middleware.Permissions(domain.PermissionCreateOrder), orders)
	handle(mux, guard, "POST "+base+"/{orderId}/items", h.addItems,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "PATCH "+base+"/{orderId}/items/bulk", h.bulkUpdate,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "POST "+base+"/{orderId}/checkout", h.checkout,
		middleware.Permissions(domain.PermissionCheckoutOrder), orders)
	handle(mux, guard, "POST "+base+"/{orderId}/cancel", h.cancel,
		middleware.Permissions(domain.PermissionCancelOrder), orders)
	handle(mux, guard, "PATCH "+base+"/{orderId}/move-table", h.moveTable,
		middleware.Permissions(domain.PermissionMoveOrderTable), orders)
	handle(mux, guard, "POST "+base+"/merge", h.merge,
		middleware.Permissions(domain.PermissionMergeOrders), orders)
	handle(mux, guard, "DELETE "+base+"/{orderId}/items/{itemId}", h.removeItem,
		middleware.Permissions(domain.PermissionDeleteOrderItem), orders)
	handle(mux, guard, "DELETE "+base+"/{orderId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteOrder), orders)
	handle(mux, guard, "PATCH "+base+"/{orderId}/tip", h.updateTip,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "PATCH "+base+"/{orderId}/notes", h.updateNotes,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "PATCH "+base+"/{orderId}/items/{itemId}/notes", h.updateItemNotes,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "POST "+base+"/{orderId}/adjustments", h.addAdjustment,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
	handle(mux, guard, "DELETE "+base+"/{orderId}/adjustments/{adjustmentId}", h.removeAdjustment,
		middleware.Permissions(domain.PermissionUpdateOrder), orders)
}

type orderLineRequest struct {
	ProductID string  `json:"productId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	Quantity  int     `json:"quantity" validate:"min=1" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	Notes     *string `json:"notes" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

type orderAdjustmentRequest struct {
	Target domain.AdjustmentTarget `json:"target" validate:"oneof=ORDER ITEM" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Type   domain.AdjustmentType   `json:"type" validate:"oneof=PERCENTAGE FIXED_AMOUNT" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Value  int                     `json:"value" validate:"min=1,percentage" msg:"min=INVALID_TYPE,percentage=INVALID_TYPE,type=INVALID_TYPE"`
	Reason *string                 `json:"reason" validate:"omitnil" msg:"type=INVALID_TYPE"`
	ItemID *string                 `json:"itemId" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

type createOrderRequest struct {
	TableID     *string                   `json:"tableId" validate:"omitnil,uuid4" msg:"uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	Items       []orderLineRequest        `json:"items" validate:"min=1,dive" msg:"min=REQUIRED,type=INVALID_TYPE"`
	Notes       *string                   `json:"notes" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Adjustments *[]orderAdjustmentRequest `json:"adjustments" validate:"omitnil,dive" msg:"type=INVALID_TYPE"`
	TipAmount   *int                      `json:"tipAmount" validate:"omitnil,min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
}

type addOrderItemsRequest struct {
	Items []orderLineRequest `json:"items" validate:"min=1,dive" msg:"min=REQUIRED,type=INVALID_TYPE"`
	Notes *string            `json:"notes" validate:"omitnil" msg:"type=INVALID_TYPE"`
}

type bulkUpdateItemRequest struct {
	ItemID         string                `json:"itemId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	PaidQuantity   *int                  `json:"paidQuantity" validate:"omitnil,min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	ServedQuantity *int                  `json:"servedQuantity" validate:"omitnil,min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	PaymentMethod  *domain.PaymentMethod `json:"paymentMethod" validate:"omitnil,oneof=CASH CARD" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
}

type bulkUpdateRequest struct {
	Items []bulkUpdateItemRequest `json:"items" validate:"min=1,dive" msg:"min=REQUIRED,type=INVALID_TYPE"`
}

type checkoutOrderRequest struct {
	PaymentMethod domain.PaymentMethod `json:"paymentMethod" validate:"required,oneof=CASH CARD" msg:"required=REQUIRED,oneof=INVALID_TYPE,type=INVALID_TYPE"`
}

type moveTableRequest struct {
	TableID string `json:"tableId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
}

type mergeOrdersRequest struct {
	OrderIDs      []string `json:"orderIds" validate:"min=2,dive,uuid4" msg:"min=INVALID_ORDER_IDS,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	TargetTableID *string  `json:"targetTableId" validate:"omitnil,uuid4" msg:"uuid4=INVALID_TYPE,type=INVALID_TYPE"`
}

type updateOrderTipRequest struct {
	TipAmount int `json:"tipAmount" validate:"min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
}

type updateOrderNotesRequest struct {
	Notes       *string `json:"notes" validate:"omitnil,max=500" msg:"max=INVALID_TYPE,type=INVALID_TYPE"`
	TicketNotes *string `json:"ticketNotes" validate:"omitnil,max=500" msg:"max=INVALID_TYPE,type=INVALID_TYPE"`
}

type updateOrderItemNotesRequest struct {
	Notes *string `json:"notes" validate:"omitnil,max=500" msg:"max=INVALID_TYPE,type=INVALID_TYPE"`
}

func (h *OrderHandler) list(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.PathValue("establishmentId")
	query := r.URL.Query()

	var orders []domain.Order
	var err error
	if date := query.Get("date"); date != "" {
		orders, err = h.orders.ListByDate(r.Context(), establishmentID, date)
	} else {
		orders, err = h.orders.List(r.Context(), establishmentID, domain.OrderStatus(query.Get("status")))
	}
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) get(w http.ResponseWriter, r *http.Request) {
	order, err := h.orders.Get(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, order)
}

func (h *OrderHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createOrderRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	create := domain.CreateOrderInput{
		CreatedByID: middleware.CurrentUser(r.Context()).ID,
		TableID:     input.TableID,
		Items:       orderLines(input.Items),
		Notes:       input.Notes,
		TipAmount:   input.TipAmount,
	}
	if input.Adjustments != nil {
		for _, adjustment := range *input.Adjustments {
			create.Adjustments = append(create.Adjustments, orderAdjustment(adjustment))
		}
	}

	if err := h.orders.Create(r.Context(), r.PathValue("establishmentId"), create); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) addItems(w http.ResponseWriter, r *http.Request) {
	var input addOrderItemsRequest
	nulls, err := decodeJSONWithNulls(r, &input)
	if err != nil {
		writeError(w, err)
		return
	}

	err = h.orders.AddItems(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), domain.AddOrderItemsInput{
		Items:      orderLines(input.Items),
		Notes:      input.Notes,
		ClearNotes: nulls["notes"],
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) bulkUpdate(w http.ResponseWriter, r *http.Request) {
	var input bulkUpdateRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	updates := make([]domain.OrderItemUpdate, 0, len(input.Items))
	for _, item := range input.Items {
		updates = append(updates, domain.OrderItemUpdate{
			ItemID:         item.ItemID,
			PaidQuantity:   item.PaidQuantity,
			ServedQuantity: item.ServedQuantity,
			PaymentMethod:  item.PaymentMethod,
		})
	}

	if err := h.orders.BulkUpdate(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), updates); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) checkout(w http.ResponseWriter, r *http.Request) {
	var input checkoutOrderRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.orders.Checkout(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), input.PaymentMethod); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) cancel(w http.ResponseWriter, r *http.Request) {
	if err := h.orders.Cancel(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) moveTable(w http.ResponseWriter, r *http.Request) {
	var input moveTableRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.orders.MoveTable(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), input.TableID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) merge(w http.ResponseWriter, r *http.Request) {
	var input mergeOrdersRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.orders.Merge(r.Context(), r.PathValue("establishmentId"), domain.MergeOrdersInput{
		OrderIDs:      input.OrderIDs,
		TargetTableID: input.TargetTableID,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) removeItem(w http.ResponseWriter, r *http.Request) {
	err := h.orders.RemoveItem(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), r.PathValue("itemId"))
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.orders.Delete(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) updateTip(w http.ResponseWriter, r *http.Request) {
	var input updateOrderTipRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.orders.UpdateTip(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), input.TipAmount); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) updateNotes(w http.ResponseWriter, r *http.Request) {
	var input updateOrderNotesRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.orders.UpdateNotes(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), domain.UpdateOrderNotesInput{
		Notes:       input.Notes,
		TicketNotes: input.TicketNotes,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) updateItemNotes(w http.ResponseWriter, r *http.Request) {
	var input updateOrderItemNotesRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.orders.UpdateItemNotes(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), r.PathValue("itemId"), input.Notes)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrderHandler) addAdjustment(w http.ResponseWriter, r *http.Request) {
	var input orderAdjustmentRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	err := h.orders.AddAdjustment(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), orderAdjustment(input))
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *OrderHandler) removeAdjustment(w http.ResponseWriter, r *http.Request) {
	err := h.orders.RemoveAdjustment(r.Context(), r.PathValue("establishmentId"), r.PathValue("orderId"), r.PathValue("adjustmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func orderLines(lines []orderLineRequest) []domain.OrderLineInput {
	inputs := make([]domain.OrderLineInput, 0, len(lines))
	for _, line := range lines {
		inputs = append(inputs, domain.OrderLineInput{ProductID: line.ProductID, Quantity: line.Quantity, Notes: line.Notes})
	}
	return inputs
}

func orderAdjustment(adjustment orderAdjustmentRequest) domain.OrderAdjustmentInput {
	return domain.OrderAdjustmentInput{
		Target: adjustment.Target,
		Type:   adjustment.Type,
		Value:  adjustment.Value,
		Reason: adjustment.Reason,
		ItemID: adjustment.ItemID,
	}
}
