package repository

import (
	"context"
	_ "embed"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/product/list_of.sql
	listProductsQuery string
	//go:embed queries/product/category_belongs_to.sql
	categoryBelongsToQuery string
	//go:embed queries/product/product_belongs_to.sql
	productBelongsToQuery string
	//go:embed queries/product/insert.sql
	insertProductQuery string
	//go:embed queries/product/update.sql
	updateProductQuery string
	//go:embed queries/product/adjust_stock.sql
	adjustProductStockQuery string
	//go:embed queries/product/soft_delete.sql
	softDeleteProductQuery string
)

type ProductRepository struct {
	pool *pgxpool.Pool
}

func NewProductRepository(pool *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{pool: pool}
}

func (r *ProductRepository) ListOf(ctx context.Context, establishmentID string) ([]domain.ProductRow, error) {
	rows, err := r.pool.Query(ctx, listProductsQuery, establishmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.ProductRow
	for rows.Next() {
		var product domain.ProductRow
		err := rows.Scan(
			&product.ID, &product.CategoryID, &product.Name, &product.Price, &product.CurrentStock,
			&product.MinStockAlert, &product.ImageURL, &product.Icon, &product.TaxRate, &product.Allergens,
			&product.UpdatedAt, &product.CategoryTaxRate,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}

	return products, rows.Err()
}

func (r *ProductRepository) CategoryBelongsTo(ctx context.Context, categoryID, establishmentID string) (bool, error) {
	var belongs bool
	err := r.pool.QueryRow(ctx, categoryBelongsToQuery, categoryID, establishmentID).Scan(&belongs)
	return belongs, err
}

func (r *ProductRepository) ProductBelongsTo(ctx context.Context, productID, establishmentID string) (bool, error) {
	var belongs bool
	err := r.pool.QueryRow(ctx, productBelongsToQuery, productID, establishmentID).Scan(&belongs)
	return belongs, err
}

func (r *ProductRepository) Create(ctx context.Context, product domain.NewProduct) (domain.ProductRow, error) {
	return insertProduct(ctx, r.pool, product)
}

func (r *ProductRepository) Update(ctx context.Context, productID string, changes domain.ProductChanges) (domain.ProductRow, error) {
	return scanProductRow(r.pool.QueryRow(ctx, updateProductQuery,
		productID, changes.Name, changes.CategoryID, changes.Price, changes.CurrentStock, changes.MinStockAlert,
		changes.ImageURL, changes.ClearImageURL, changes.Icon, changes.ClearIcon, changes.Allergens,
		changes.OwnTaxRate, changes.ClearOwnTaxRate, now(),
	))
}

func (r *ProductRepository) AdjustStock(ctx context.Context, productID string, delta int) (domain.ProductRow, error) {
	return scanProductRow(r.pool.QueryRow(ctx, adjustProductStockQuery, productID, delta, now()))
}

func (r *ProductRepository) Delete(ctx context.Context, productID string) error {
	_, err := r.pool.Exec(ctx, softDeleteProductQuery, productID, now())
	return err
}

func insertProduct(ctx context.Context, db querier, product domain.NewProduct) (domain.ProductRow, error) {
	allergens := product.Allergens
	if allergens == nil {
		allergens = []string{}
	}

	return scanProductRow(db.QueryRow(ctx, insertProductQuery,
		uuid.NewV4().String(), product.CategoryID, product.Name, product.Price, product.CurrentStock,
		product.MinStockAlert, product.ImageURL, product.Icon, product.TaxRate, allergens, now(),
	))
}

func scanProductRow(row pgx.Row) (domain.ProductRow, error) {
	var product domain.ProductRow
	err := row.Scan(
		&product.ID, &product.CategoryID, &product.Name, &product.Price, &product.CurrentStock,
		&product.MinStockAlert, &product.ImageURL, &product.Icon, &product.TaxRate, &product.Allergens,
		&product.UpdatedAt,
	)
	return product, err
}
