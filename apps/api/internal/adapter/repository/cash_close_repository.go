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
	//go:embed queries/cash_close/list_recent.sql
	listRecentCashClosesQuery string
	//go:embed queries/cash_close/list_closed_between.sql
	listCashClosesClosedBetweenQuery string
	//go:embed queries/cash_close/find_by_id.sql
	findCashCloseByIDQuery string
	//go:embed queries/cash_close/find_last.sql
	findLastCashCloseQuery string
	//go:embed queries/cash_close/find_unclosed_orders.sql
	findUnclosedOrdersQuery string
	//go:embed queries/cash_close/find_orders_of_close.sql
	findOrdersOfCashCloseQuery string
	//go:embed queries/cash_close/order_items_of.sql
	cashCloseOrderItemsQuery string
	//go:embed queries/cash_close/order_adjustments_of.sql
	cashCloseOrderAdjustmentsQuery string
	//go:embed queries/cash_close/find_open_orders_charges.sql
	findOpenOrdersChargesQuery string
	//go:embed queries/cash_close/lock_establishment.sql
	lockCashCloseEstablishmentQuery string
	//go:embed queries/cash_close/insert.sql
	insertCashCloseQuery string
	//go:embed queries/cash_close/assign_orders.sql
	assignOrdersToCashCloseQuery string
	//go:embed queries/cash_close/update_totals.sql
	updateCashCloseTotalsQuery string
	//go:embed queries/cash_close/void.sql
	voidCashCloseQuery string
	//go:embed queries/cash_close/release_orders.sql
	releaseCashCloseOrdersQuery string
)

type CashCloseRepository struct {
	pool *pgxpool.Pool
}

func NewCashCloseRepository(pool *pgxpool.Pool) *CashCloseRepository {
	return &CashCloseRepository{pool: pool}
}

func (r *CashCloseRepository) ListRecent(ctx context.Context, establishmentID string) ([]domain.CashClose, error) {
	rows, err := r.pool.Query(ctx, listRecentCashClosesQuery, establishmentID)
	if err != nil {
		return nil, err
	}
	return collectCashCloses(rows)
}

func (r *CashCloseRepository) ListClosedBetween(ctx context.Context, establishmentID string, from, to time.Time) ([]domain.CashClose, error) {
	rows, err := r.pool.Query(ctx, listCashClosesClosedBetweenQuery, establishmentID, from, to)
	if err != nil {
		return nil, err
	}
	return collectCashCloses(rows)
}

func collectCashCloses(rows pgx.Rows) ([]domain.CashClose, error) {
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.CashClose, error) {
		return scanCashClose(row)
	})
}

func (r *CashCloseRepository) FindTill(ctx context.Context, establishmentID string) (domain.CashCloseTill, error) {
	var till domain.CashCloseTill
	options := pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly}

	err := pgx.BeginTxFunc(ctx, r.pool, options, func(tx pgx.Tx) error {
		var err error
		till.Last, err = findLastCashClose(ctx, tx, establishmentID)
		if err != nil {
			return err
		}

		till.UnclosedOrders, err = findCashCloseOrders(ctx, tx, findUnclosedOrdersQuery, establishmentID)
		if err != nil {
			return err
		}

		till.OpenOrdersCharges, err = findOpenOrdersCharges(ctx, tx, establishmentID)
		return err
	})

	return till, err
}

func findLastCashClose(ctx context.Context, tx pgx.Tx, establishmentID string) (*domain.LastCashClose, error) {
	var last domain.LastCashClose

	err := tx.QueryRow(ctx, findLastCashCloseQuery, establishmentID).Scan(&last.ID, &last.ClosedAt, &last.OpeningFloat)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &last, nil
}

func findOpenOrdersCharges(ctx context.Context, tx pgx.Tx, establishmentID string) ([]domain.OpenOrderCharge, error) {
	rows, err := tx.Query(ctx, findOpenOrdersChargesQuery, establishmentID)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.OpenOrderCharge, error) {
		var charge domain.OpenOrderCharge
		err := row.Scan(&charge.AmountPaidCash, &charge.AmountPaidCard)
		return charge, err
	})
}

func (r *CashCloseRepository) Close(ctx context.Context, input domain.NewCashClose) (domain.CashClose, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.CashClose{}, err
	}
	defer tx.Rollback(ctx)

	if err := lockCashCloseEstablishment(ctx, tx, input.EstablishmentID); err != nil {
		return domain.CashClose{}, err
	}

	last, err := findLastCashClose(ctx, tx, input.EstablishmentID)
	if err != nil {
		return domain.CashClose{}, err
	}
	var since *time.Time
	if last != nil {
		since = &last.ClosedAt
	}

	id := uuid.NewV4().String()
	closedAt := now()
	_, err = tx.Exec(ctx, insertCashCloseQuery,
		id, input.EstablishmentID, input.ClosedByID, since, closedAt, input.OpeningFloat, input.CountedCash, input.Notes,
	)
	if err != nil {
		return domain.CashClose{}, err
	}

	if _, err := tx.Exec(ctx, assignOrdersToCashCloseQuery, input.EstablishmentID, id, closedAt); err != nil {
		return domain.CashClose{}, err
	}

	orders, err := findCashCloseOrders(ctx, tx, findOrdersOfCashCloseQuery, id)
	if err != nil {
		return domain.CashClose{}, err
	}

	totals := domain.CashCloseTotalsOf(orders)
	_, err = tx.Exec(ctx, updateCashCloseTotalsQuery, id,
		totals.ClosedOrders, totals.CancelledOrders, totals.CancelledAmount, totals.CashAmount, totals.CardAmount, totals.TipAmount,
	)
	if err != nil {
		return domain.CashClose{}, err
	}

	closed, err := scanCashClose(tx.QueryRow(ctx, findCashCloseByIDQuery, id))
	if err != nil {
		return domain.CashClose{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.CashClose{}, err
	}

	return closed, nil
}

func (r *CashCloseRepository) Void(ctx context.Context, input domain.VoidCashClose) (domain.CashClose, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.CashClose{}, err
	}
	defer tx.Rollback(ctx)

	if err := lockCashCloseEstablishment(ctx, tx, input.EstablishmentID); err != nil {
		return domain.CashClose{}, err
	}

	cashClose, err := scanCashClose(tx.QueryRow(ctx, findCashCloseByIDQuery, input.CashCloseID))
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && cashClose.EstablishmentID != input.EstablishmentID) {
		return domain.CashClose{}, domain.NotFound(domain.CodeCashCloseNotFound)
	}
	if err != nil {
		return domain.CashClose{}, err
	}
	if cashClose.VoidedAt != nil {
		return domain.CashClose{}, domain.BadRequest(domain.CodeCashCloseAlreadyVoided)
	}

	last, err := findLastCashClose(ctx, tx, input.EstablishmentID)
	if err != nil {
		return domain.CashClose{}, err
	}
	if last == nil || last.ID != cashClose.ID {
		return domain.CashClose{}, domain.BadRequest(domain.CodeCashCloseNotLast)
	}

	voidedAt := now()
	if _, err := tx.Exec(ctx, voidCashCloseQuery, cashClose.ID, voidedAt, input.VoidedByID); err != nil {
		return domain.CashClose{}, err
	}
	if _, err := tx.Exec(ctx, releaseCashCloseOrdersQuery, cashClose.ID, voidedAt); err != nil {
		return domain.CashClose{}, err
	}

	voided, err := scanCashClose(tx.QueryRow(ctx, findCashCloseByIDQuery, cashClose.ID))
	if err != nil {
		return domain.CashClose{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.CashClose{}, err
	}

	return voided, nil
}

func lockCashCloseEstablishment(ctx context.Context, tx pgx.Tx, establishmentID string) error {
	var lockedID string
	err := tx.QueryRow(ctx, lockCashCloseEstablishmentQuery, establishmentID).Scan(&lockedID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.NotFound(domain.CodeEstablishmentNotFound)
	}
	return err
}

func scanCashClose(row pgx.Row) (domain.CashClose, error) {
	var c domain.CashClose
	err := row.Scan(
		&c.ID, &c.EstablishmentID, &c.ClosedByID, &c.ClosedByName, &c.Since, &c.ClosedAt,
		&c.ClosedOrders, &c.CancelledOrders, &c.CancelledAmount, &c.CashAmount, &c.CardAmount, &c.TipAmount,
		&c.OpeningFloat, &c.CountedCash, &c.Notes, &c.VoidedAt, &c.VoidedByID, &c.VoidedByName,
	)
	return c, err
}

type cashCloseReader interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type cashCloseItemRow struct {
	orderID string
	item    domain.PricingItem
}

type cashCloseAdjustmentRow struct {
	orderID    string
	adjustment domain.PricingAdjustment
}

func findCashCloseOrders(ctx context.Context, db cashCloseReader, query string, arg string) ([]domain.CashCloseOrder, error) {
	rows, err := db.Query(ctx, query, arg)
	if err != nil {
		return nil, err
	}

	var ids []string
	orders, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.CashCloseOrder, error) {
		var id, status string
		var order domain.CashCloseOrder
		err := row.Scan(&id, &status, &order.AmountPaidCash, &order.AmountPaidCard, &order.TipAmount)
		ids = append(ids, id)
		order.Status = domain.OrderStatus(status)
		return order, err
	})
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return orders, nil
	}

	position := make(map[string]int, len(ids))
	for i, id := range ids {
		position[id] = i
	}

	itemRows, err := db.Query(ctx, cashCloseOrderItemsQuery, ids)
	if err != nil {
		return nil, err
	}

	items, err := pgx.CollectRows(itemRows, func(row pgx.CollectableRow) (cashCloseItemRow, error) {
		var read cashCloseItemRow
		err := row.Scan(&read.orderID, &read.item.ID, &read.item.PriceAtPurchase, &read.item.Quantity, &read.item.PaidQuantity, &read.item.TaxRate)
		return read, err
	})
	if err != nil {
		return nil, err
	}

	for _, read := range items {
		i := position[read.orderID]
		orders[i].Items = append(orders[i].Items, read.item)
	}

	adjustmentRows, err := db.Query(ctx, cashCloseOrderAdjustmentsQuery, ids)
	if err != nil {
		return nil, err
	}

	adjustments, err := pgx.CollectRows(adjustmentRows, func(row pgx.CollectableRow) (cashCloseAdjustmentRow, error) {
		var read cashCloseAdjustmentRow
		var target, adjustmentType string
		err := row.Scan(&read.orderID, &read.adjustment.ID, &target, &adjustmentType, &read.adjustment.Value, &read.adjustment.ItemID)
		read.adjustment.Target = domain.AdjustmentTarget(target)
		read.adjustment.Type = domain.AdjustmentType(adjustmentType)
		return read, err
	})
	if err != nil {
		return nil, err
	}

	for _, read := range adjustments {
		i := position[read.orderID]
		orders[i].Adjustments = append(orders[i].Adjustments, read.adjustment)
	}

	return orders, nil
}
