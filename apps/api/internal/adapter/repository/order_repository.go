package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/order/list_of.sql
	listOrdersQuery string
	//go:embed queries/order/list_created_between.sql
	listOrdersCreatedBetweenQuery string
	//go:embed queries/order/find_by_ids.sql
	findOrdersByIDsQuery string
	//go:embed queries/order/items_of.sql
	orderItemsOfQuery string
	//go:embed queries/order/adjustments_of.sql
	orderAdjustmentsOfQuery string
	//go:embed queries/order/find_products.sql
	findOrderProductsQuery string
	//go:embed queries/order/insert.sql
	insertOrderQuery string
	//go:embed queries/order/insert_item.sql
	insertOrderItemQuery string
	//go:embed queries/order/insert_adjustment.sql
	insertOrderAdjustmentQuery string
	//go:embed queries/order/lock.sql
	lockOrderQuery string
	//go:embed queries/order/is_open.sql
	orderIsOpenQuery string
	//go:embed queries/order/find_item.sql
	findOrderItemQuery string
	//go:embed queries/order/set_item_paid.sql
	setOrderItemPaidQuery string
	//go:embed queries/order/set_item_served.sql
	setOrderItemServedQuery string
	//go:embed queries/order/set_amounts_paid.sql
	setOrderAmountsPaidQuery string
	//go:embed queries/order/claim_for_checkout.sql
	claimOrderForCheckoutQuery string
	//go:embed queries/order/close.sql
	closeOrderQuery string
	//go:embed queries/order/cancel_open.sql
	cancelOpenOrderQuery string
	//go:embed queries/order/set_total.sql
	setOrderTotalQuery string
	//go:embed queries/order/move_to_table.sql
	moveOrderToTableQuery string
	//go:embed queries/order/freeze_adjustment.sql
	freezeOrderAdjustmentQuery string
	//go:embed queries/order/move_items.sql
	moveOrderItemsQuery string
	//go:embed queries/order/cancel_merged.sql
	cancelMergedOrderQuery string
	//go:embed queries/order/update_merged.sql
	updateMergedOrderQuery string
	//go:embed queries/order/delete_item.sql
	deleteOrderItemQuery string
	//go:embed queries/order/delete.sql
	deleteOrderQuery string
	//go:embed queries/order/update_notes.sql
	updateOrderNotesQuery string
	//go:embed queries/order/update_item_notes.sql
	updateOrderItemNotesQuery string
	//go:embed queries/order/update_tip.sql
	updateOrderTipQuery string
	//go:embed queries/order/delete_adjustment.sql
	deleteOrderAdjustmentQuery string
)

var errMissingRow = errors.New("the row to write is not there")

func execExisting(ctx context.Context, db querier, sql string, args ...any) error {
	tag, err := db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errMissingRow
	}
	return nil
}

func execWhileOpen(ctx context.Context, db querier, sql string, args ...any) error {
	tag, err := db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.BadRequest(domain.CodeOrderNotOpen)
	}
	return nil
}

type orderDB interface {
	querier
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type OrderRepository struct {
	pool *pgxpool.Pool
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
	return &OrderRepository{pool: pool}
}

func (r *OrderRepository) ListOf(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.OrderRow, error) {
	var onlyStatus *string
	if status != "" {
		value := string(status)
		onlyStatus = &value
	}
	return queryOrders(ctx, r.pool, listOrdersQuery, establishmentID, onlyStatus)
}

func (r *OrderRepository) ListCreatedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.OrderRow, error) {
	return queryOrders(ctx, r.pool, listOrdersCreatedBetweenQuery, establishmentID, from.UTC(), to.UTC())
}

func (r *OrderRepository) FindByID(ctx context.Context, orderID string) (*domain.OrderRow, error) {
	orders, err := queryOrders(ctx, r.pool, findOrdersByIDsQuery, []string{orderID})
	if err != nil || len(orders) == 0 {
		return nil, err
	}
	return &orders[0], nil
}

func (r *OrderRepository) FindByIDs(ctx context.Context, orderIDs []string) ([]domain.OrderRow, error) {
	return queryOrders(ctx, r.pool, findOrdersByIDsQuery, orderIDs)
}

func (r *OrderRepository) FindProducts(ctx context.Context, establishmentID string, productIDs []string) ([]domain.OrderProduct, error) {
	rows, err := r.pool.Query(ctx, findOrderProductsQuery, establishmentID, productIDs)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.OrderProduct, error) {
		var product domain.OrderProduct
		var productTaxRate, categoryTaxRate *int

		err := row.Scan(&product.ID, &product.Name, &product.Price, &productTaxRate, &categoryTaxRate)
		product.TaxRate = domain.ResolveTaxRate(productTaxRate, categoryTaxRate)
		return product, err
	})
}

func (r *OrderRepository) Create(ctx context.Context, order domain.NewOrder) (domain.OrderRow, error) {
	orderID := uuid.NewV4().String()

	var created domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		at := now()

		_, err := tx.Exec(ctx, insertOrderQuery, orderID, order.EstablishmentID, order.CreatedByID, order.TableID,
			order.TableName, order.TotalAmount, order.TipAmount, order.Notes, at)
		if err != nil {
			return err
		}

		if err := insertOrderItems(ctx, tx, orderID, order.Items, at); err != nil {
			return err
		}

		for _, adjustment := range order.Adjustments {
			if err := insertOrderAdjustment(ctx, tx, orderID, adjustment, at); err != nil {
				return err
			}
		}

		if order.TableID != nil {
			if err := setTableStatus(ctx, tx, *order.TableID, domain.TableOccupied); err != nil {
				return err
			}
		}

		created, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return created, err
}

func (r *OrderRepository) AddItems(ctx context.Context, orderID string, addition domain.OrderItemsAddition) (domain.OrderRow, error) {
	var updated domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		at := now()

		if err := insertOrderItems(ctx, tx, orderID, addition.Items, at); err != nil {
			return err
		}

		if err := execExisting(ctx, tx, setOrderTotalQuery, orderID, addition.TotalAmount, at); err != nil {
			return err
		}

		if addition.ChangeNotes {
			if err := execExisting(ctx, tx, updateOrderNotesQuery, orderID, true, addition.Notes, false, nil, at); err != nil {
				return err
			}
		}

		var err error
		updated, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return updated, err
}

func (r *OrderRepository) BulkUpdate(ctx context.Context, orderID string, updates []domain.OrderItemUpdate) (domain.OrderRow, error) {
	var updated domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, lockOrderQuery, orderID); err != nil {
			return err
		}

		var open bool
		if err := tx.QueryRow(ctx, orderIsOpenQuery, orderID).Scan(&open); err != nil {
			return err
		}
		if !open {
			return domain.BadRequest(domain.CodeOrderNotOpen)
		}

		at := now()
		for _, update := range updates {
			if err := updateOrderItem(ctx, tx, orderID, update, at); err != nil {
				return err
			}
		}

		order, err := loadOrder(ctx, tx, orderID)
		if err != nil {
			return err
		}

		cash, card := order.AmountsPaidByLine()
		err = execExisting(ctx, tx, setOrderAmountsPaidQuery, orderID, domain.PaymentMethodFor(cash, card), cash, card, at)
		if err != nil {
			return err
		}

		updated, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return updated, err
}

func updateOrderItem(ctx context.Context, tx pgx.Tx, orderID string, update domain.OrderItemUpdate, at time.Time) error {
	var item domain.OrderItemRow
	err := tx.QueryRow(ctx, findOrderItemQuery, update.ItemID).Scan(
		&item.OrderID, &item.Quantity, &item.PaidQuantity, &item.PaidQuantityCash, &item.PaidQuantityCard,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if item.OrderID != orderID {
		return nil
	}

	if update.PaidQuantity != nil {
		paid := item.PaidAfter(*update.PaidQuantity, update.PaymentMethod)
		err := execExisting(ctx, tx, setOrderItemPaidQuery, update.ItemID, paid.Quantity, paid.Cash, paid.Card, paid.Status, paid.Method, at)
		if err != nil {
			return err
		}
	}

	if update.ServedQuantity != nil {
		served := *update.ServedQuantity
		if err := execExisting(ctx, tx, setOrderItemServedQuery, update.ItemID, served, item.ServedAfter(served), at); err != nil {
			return err
		}
	}

	return nil
}

func (r *OrderRepository) Checkout(ctx context.Context, orderID string, tableID *string, method domain.PaymentMethod) (domain.OrderRow, error) {
	var closed domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		at := now()

		claimed, err := tx.Exec(ctx, claimOrderForCheckoutQuery, orderID, at)
		if err != nil {
			return err
		}
		if claimed.RowsAffected() == 0 {
			return domain.BadRequest(domain.CodeOrderNotOpen)
		}

		order, err := loadOrder(ctx, tx, orderID)
		if err != nil {
			return err
		}

		for _, item := range order.Items {
			if item.PaymentStatus == domain.PaymentPaid {
				continue
			}
			paid := item.PaidInFull(method)
			err := execExisting(ctx, tx, setOrderItemPaidQuery, item.ID, paid.Quantity, paid.Cash, paid.Card, paid.Status, paid.Method, at)
			if err != nil {
				return err
			}
		}

		order, err = loadOrder(ctx, tx, orderID)
		if err != nil {
			return err
		}

		cash, card := order.AmountsAfterCheckout(method)
		err = execExisting(ctx, tx, closeOrderQuery, orderID, order.ItemsTotal(), domain.PaymentMethodFor(cash, card), cash, card, at)
		if err != nil {
			return err
		}

		if tableID != nil {
			if err := setTableStatus(ctx, tx, *tableID, domain.TableFree); err != nil {
				return err
			}
		}

		closed, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return closed, err
}

func (r *OrderRepository) Cancel(ctx context.Context, orderID string, tableID *string) (domain.OrderRow, error) {
	var cancelled domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if err := execWhileOpen(ctx, tx, cancelOpenOrderQuery, orderID, now()); err != nil {
			return err
		}

		if tableID != nil {
			if err := setTableStatus(ctx, tx, *tableID, domain.TableFree); err != nil {
				return err
			}
		}

		var err error
		cancelled, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return cancelled, err
}

func (r *OrderRepository) MoveTable(ctx context.Context, orderID string, oldTableID *string, newTableID, newTableName string) (domain.OrderRow, error) {
	var moved domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if err := execWhileOpen(ctx, tx, moveOrderToTableQuery, orderID, newTableID, newTableName, now()); err != nil {
			return err
		}

		if oldTableID != nil {
			if err := setTableStatus(ctx, tx, *oldTableID, domain.TableFree); err != nil {
				return err
			}
		}

		if err := setTableStatus(ctx, tx, newTableID, domain.TableOccupied); err != nil {
			return err
		}

		var err error
		moved, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return moved, err
}

func (r *OrderRepository) Merge(ctx context.Context, merge domain.OrderMerge) (domain.OrderRow, error) {
	var merged domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		at := now()

		primary, err := freezeOrderDiscounts(ctx, tx, merge.PrimaryID, nil)
		if err != nil {
			return err
		}

		carriedCash, carriedCard, carriedTip := 0, 0, 0
		for _, source := range merge.Sources {
			sourceOrder, err := freezeOrderDiscounts(ctx, tx, source.ID, &merge.PrimaryID)
			if err != nil {
				return err
			}

			carriedCash += sourceOrder.AmountPaidCash
			carriedCard += sourceOrder.AmountPaidCard
			carriedTip += sourceOrder.TipAmount

			if _, err := tx.Exec(ctx, moveOrderItemsQuery, source.ID, merge.PrimaryID, at); err != nil {
				return err
			}

			if err := execExisting(ctx, tx, cancelMergedOrderQuery, source.ID, at); err != nil {
				return err
			}

			if source.TableID != nil {
				if err := setTableStatus(ctx, tx, *source.TableID, domain.TableFree); err != nil {
					return err
				}
			}
		}

		tableID, tableName := merge.PrimaryTableID, merge.PrimaryTableName
		if merge.TargetTableID != nil {
			if merge.PrimaryTableID != nil && *merge.PrimaryTableID != *merge.TargetTableID {
				if err := setTableStatus(ctx, tx, *merge.PrimaryTableID, domain.TableFree); err != nil {
					return err
				}
			}

			if err := setTableStatus(ctx, tx, *merge.TargetTableID, domain.TableOccupied); err != nil {
				return err
			}

			target, err := findTable(ctx, tx, *merge.TargetTableID)
			if err != nil {
				return err
			}
			if target != nil {
				tableName = &target.Name
			}
			tableID = merge.TargetTableID
		}

		order, err := loadOrder(ctx, tx, merge.PrimaryID)
		if err != nil {
			return err
		}

		cash := primary.AmountPaidCash + carriedCash
		card := primary.AmountPaidCard + carriedCard
		err = execExisting(ctx, tx, updateMergedOrderQuery, merge.PrimaryID, order.ItemsTotal(), tableID, tableName,
			cash, card, domain.PaymentMethodFor(cash, card), primary.TipAmount+carriedTip, at)
		if err != nil {
			return err
		}

		merged, err = loadOrder(ctx, tx, merge.PrimaryID)
		return err
	})

	return merged, err
}

func freezeOrderDiscounts(ctx context.Context, tx pgx.Tx, orderID string, moveTo *string) (domain.OrderRow, error) {
	orders, err := queryOrders(ctx, tx, findOrdersByIDsQuery, []string{orderID})
	if err != nil || len(orders) == 0 {
		return domain.OrderRow{}, err
	}
	order := orders[0]

	itemsSubtotal := order.ItemsTotal()
	for _, adjustment := range order.Adjustments {
		isOrderPercentage := adjustment.Target == domain.AdjustmentOrder && adjustment.Type == domain.AdjustmentPercentage
		if !isOrderPercentage && moveTo == nil {
			continue
		}

		newOrderID, newType, newValue := adjustment.OrderID, adjustment.Type, adjustment.Value
		if moveTo != nil {
			newOrderID = *moveTo
		}
		if isOrderPercentage {
			newType = domain.AdjustmentFixedAmount
			newValue = domain.PercentageOf(itemsSubtotal, adjustment.Value)
		}

		if err := execExisting(ctx, tx, freezeOrderAdjustmentQuery, adjustment.ID, newOrderID, newType, newValue); err != nil {
			return domain.OrderRow{}, err
		}
	}

	return order, nil
}

func (r *OrderRepository) RemoveItem(ctx context.Context, orderID, itemID string) (domain.OrderRow, error) {
	var updated domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if err := execExisting(ctx, tx, deleteOrderItemQuery, itemID); err != nil {
			return err
		}

		order, err := loadOrder(ctx, tx, orderID)
		if err != nil {
			return err
		}

		if err := execExisting(ctx, tx, setOrderTotalQuery, orderID, order.ItemsTotal(), now()); err != nil {
			return err
		}

		updated, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return updated, err
}

func (r *OrderRepository) RemoveLastItemAndCancel(ctx context.Context, orderID, itemID string, tableID *string) (domain.OrderRow, error) {
	var cancelled domain.OrderRow
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		at := now()

		if err := execExisting(ctx, tx, deleteOrderItemQuery, itemID); err != nil {
			return err
		}

		if err := execWhileOpen(ctx, tx, cancelOpenOrderQuery, orderID, at); err != nil {
			return err
		}

		if err := execExisting(ctx, tx, setOrderTotalQuery, orderID, 0, at); err != nil {
			return err
		}

		if tableID != nil {
			if err := setTableStatus(ctx, tx, *tableID, domain.TableFree); err != nil {
				return err
			}
		}

		var err error
		cancelled, err = loadOrder(ctx, tx, orderID)
		return err
	})

	return cancelled, err
}

func (r *OrderRepository) Delete(ctx context.Context, orderID string) error {
	return execExisting(ctx, r.pool, deleteOrderQuery, orderID)
}

func (r *OrderRepository) UpdateNotes(ctx context.Context, orderID string, changes domain.OrderNotesChanges) (domain.OrderRow, error) {
	if changes.ChangeNotes || changes.ChangeTicketNotes {
		err := execExisting(ctx, r.pool, updateOrderNotesQuery, orderID,
			changes.ChangeNotes, changes.Notes, changes.ChangeTicketNotes, changes.TicketNotes, now())
		if err != nil {
			return domain.OrderRow{}, err
		}
	}

	return loadOrder(ctx, r.pool, orderID)
}

func (r *OrderRepository) UpdateItemNotes(ctx context.Context, orderID, itemID string, notes *string) (domain.OrderRow, error) {
	if err := execExisting(ctx, r.pool, updateOrderItemNotesQuery, orderID, itemID, notes, now()); err != nil {
		return domain.OrderRow{}, err
	}
	return loadOrder(ctx, r.pool, orderID)
}

func (r *OrderRepository) UpdateTip(ctx context.Context, orderID string, tipAmount int) error {
	return execExisting(ctx, r.pool, updateOrderTipQuery, orderID, tipAmount, now())
}

func (r *OrderRepository) AddAdjustment(ctx context.Context, orderID string, adjustment domain.NewOrderAdjustment) (domain.OrderRow, error) {
	if err := insertOrderAdjustment(ctx, r.pool, orderID, adjustment, now()); err != nil {
		return domain.OrderRow{}, err
	}
	return loadOrder(ctx, r.pool, orderID)
}

func (r *OrderRepository) RemoveAdjustment(ctx context.Context, orderID, adjustmentID string) (domain.OrderRow, error) {
	if err := execExisting(ctx, r.pool, deleteOrderAdjustmentQuery, orderID, adjustmentID); err != nil {
		return domain.OrderRow{}, err
	}
	return loadOrder(ctx, r.pool, orderID)
}

func insertOrderItems(ctx context.Context, tx pgx.Tx, orderID string, items []domain.NewOrderItem, at time.Time) error {
	for _, item := range items {
		_, err := tx.Exec(ctx, insertOrderItemQuery, uuid.NewV4().String(), orderID, item.ProductID, item.Quantity,
			item.Price, item.ProductName, item.TaxRate, item.Notes, at)
		if err != nil {
			return err
		}
	}
	return nil
}

func insertOrderAdjustment(ctx context.Context, db querier, orderID string, adjustment domain.NewOrderAdjustment, at time.Time) error {
	_, err := db.Exec(ctx, insertOrderAdjustmentQuery, uuid.NewV4().String(), orderID, adjustment.Target,
		adjustment.ItemID, adjustment.Type, adjustment.Value, adjustment.Reason, at)
	return err
}

func loadOrder(ctx context.Context, db orderDB, orderID string) (domain.OrderRow, error) {
	orders, err := queryOrders(ctx, db, findOrdersByIDsQuery, []string{orderID})
	if err != nil {
		return domain.OrderRow{}, err
	}
	if len(orders) == 0 {
		return domain.OrderRow{}, errMissingRow
	}
	return orders[0], nil
}

func queryOrders(ctx context.Context, db orderDB, sql string, args ...any) ([]domain.OrderRow, error) {
	rows, err := db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}

	orders, err := pgx.CollectRows(rows, scanOrder)
	if err != nil || len(orders) == 0 {
		return orders, err
	}

	position := make(map[string]int, len(orders))
	orderIDs := make([]string, 0, len(orders))
	for i, order := range orders {
		position[order.ID] = i
		orderIDs = append(orderIDs, order.ID)
	}

	itemRows, err := db.Query(ctx, orderItemsOfQuery, orderIDs)
	if err != nil {
		return nil, err
	}
	items, err := pgx.CollectRows(itemRows, scanOrderItem)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		i := position[item.OrderID]
		orders[i].Items = append(orders[i].Items, item)
	}

	adjustmentRows, err := db.Query(ctx, orderAdjustmentsOfQuery, orderIDs)
	if err != nil {
		return nil, err
	}
	adjustments, err := pgx.CollectRows(adjustmentRows, scanOrderAdjustment)
	if err != nil {
		return nil, err
	}
	for _, adjustment := range adjustments {
		i := position[adjustment.OrderID]
		orders[i].Adjustments = append(orders[i].Adjustments, adjustment)
	}

	return orders, nil
}

func scanOrder(row pgx.CollectableRow) (domain.OrderRow, error) {
	var order domain.OrderRow
	err := row.Scan(
		&order.ID, &order.EstablishmentID, &order.TableID, &order.TableName, &order.LinkedTableName, &order.Status,
		&order.TotalAmount, &order.AmountPaidCash, &order.AmountPaidCard, &order.PaymentMethod, &order.Notes,
		&order.TicketNotes, &order.TipAmount, &order.CashCloseID, &order.CreatedAt, &order.UpdatedAt,
	)
	return order, err
}

func scanOrderItem(row pgx.CollectableRow) (domain.OrderItemRow, error) {
	var item domain.OrderItemRow
	err := row.Scan(
		&item.ID, &item.OrderID, &item.ProductID, &item.ProductName, &item.Quantity, &item.PriceAtPurchase,
		&item.TaxRateAtPurchase, &item.PaidQuantity, &item.PaidQuantityCash, &item.PaidQuantityCard,
		&item.ServedQuantity, &item.PaymentStatus, &item.DeliveryStatus, &item.PaymentMethod, &item.Notes,
		&item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func scanOrderAdjustment(row pgx.CollectableRow) (domain.OrderAdjustmentRow, error) {
	var adjustment domain.OrderAdjustmentRow
	err := row.Scan(
		&adjustment.ID, &adjustment.OrderID, &adjustment.Target, &adjustment.ItemID, &adjustment.Type,
		&adjustment.Value, &adjustment.Reason, &adjustment.CreatedAt,
	)
	return adjustment, err
}
