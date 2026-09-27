package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	//go:embed queries/printer_pairing/insert.sql
	insertPrinterPairingQuery string
	//go:embed queries/printer_pairing/redeem.sql
	redeemPrinterPairingQuery string
)

// PrinterPairingRepository reads and writes the "PrinterPairing" rows.
type PrinterPairingRepository struct {
	pool *pgxpool.Pool
}

func NewPrinterPairingRepository(pool *pgxpool.Pool) *PrinterPairingRepository {
	return &PrinterPairingRepository{pool: pool}
}

func (r *PrinterPairingRepository) Issue(ctx context.Context, code, establishmentID string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, insertPrinterPairingQuery, uuid.NewV4().String(), code, establishmentID, expiresAt.UTC())
	return err
}

// Redeem marks the code redeemed only if it is still unused and valid, so of two requests
// with the same code only one gets the establishment.
func (r *PrinterPairingRepository) Redeem(ctx context.Context, code string, now time.Time) (string, error) {
	var establishmentID string
	err := r.pool.QueryRow(ctx, redeemPrinterPairingQuery, code, now.UTC()).Scan(&establishmentID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return establishmentID, err
}
