package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/printer_config/find.sql
	findPrinterConfigQuery string
	//go:embed queries/printer_config/insert.sql
	insertPrinterConfigQuery string
	//go:embed queries/printer_config/upsert_address.sql
	upsertPrinterAddressQuery string
	//go:embed queries/printer_config/update_device_key.sql
	updatePrinterDeviceKeyQuery string
	//go:embed queries/printer_config/touch_last_seen.sql
	touchPrinterLastSeenQuery string
)

// PrinterConfigRepository reads and writes the "PrinterConfig" rows, one per establishment.
// A new row gets a random device key, like Prisma's @default(uuid()).
type PrinterConfigRepository struct {
	pool *pgxpool.Pool
}

func NewPrinterConfigRepository(pool *pgxpool.Pool) *PrinterConfigRepository {
	return &PrinterConfigRepository{pool: pool}
}

func (r *PrinterConfigRepository) Find(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	config, err := scanPrinterConfig(r.pool.QueryRow(ctx, findPrinterConfigQuery, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return config, err
}

func (r *PrinterConfigRepository) Create(ctx context.Context, establishmentID string) (*domain.PrinterConfig, error) {
	return scanPrinterConfig(r.pool.QueryRow(ctx, insertPrinterConfigQuery,
		uuid.NewV4().String(), establishmentID, uuid.NewV4().String(), now(),
	))
}

func (r *PrinterConfigRepository) RegisterAddress(ctx context.Context, establishmentID, ipAddress string, port *int, seenAt time.Time) error {
	_, err := r.pool.Exec(ctx, upsertPrinterAddressQuery,
		uuid.NewV4().String(), establishmentID, uuid.NewV4().String(), ipAddress, port, seenAt.UTC(),
	)
	return err
}

func (r *PrinterConfigRepository) RotateDeviceKey(ctx context.Context, establishmentID, deviceKey string) error {
	_, err := r.pool.Exec(ctx, updatePrinterDeviceKeyQuery, establishmentID, deviceKey, now())
	return err
}

func (r *PrinterConfigRepository) TouchLastSeen(ctx context.Context, establishmentID string, seenAt time.Time) error {
	_, err := r.pool.Exec(ctx, touchPrinterLastSeenQuery, establishmentID, seenAt.UTC())
	return err
}

// scanPrinterConfig reads a row of find.sql or insert.sql.
func scanPrinterConfig(row pgx.Row) (*domain.PrinterConfig, error) {
	var config domain.PrinterConfig
	err := row.Scan(&config.EstablishmentID, &config.DeviceKey, &config.IPAddress, &config.Port, &config.LastSeenAt)
	if err != nil {
		return nil, err
	}
	return &config, nil
}
