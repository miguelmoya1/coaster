package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/printer_pairing/insert.sql
	insertPrinterPairingQuery string
	//go:embed queries/printer_pairing/redeem.sql
	redeemPrinterPairingQuery string
)

type PrinterPairingRepository struct {
	pool *pgxpool.Pool
}

func NewPrinterPairingRepository(pool *pgxpool.Pool) *PrinterPairingRepository {
	return &PrinterPairingRepository{pool: pool}
}

func (r *PrinterPairingRepository) Issue(ctx context.Context, code, establishmentID string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, insertPrinterPairingQuery, uuid.NewV4().String(), code, establishmentID, expiresAt.UTC())

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return domain.NotFound(domain.CodeEstablishmentNotFound)
	}
	return err
}

func (r *PrinterPairingRepository) Redeem(ctx context.Context, code string, now time.Time) (string, error) {
	var establishmentID string
	err := r.pool.QueryRow(ctx, redeemPrinterPairingQuery, code, now.UTC()).Scan(&establishmentID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return establishmentID, err
}
