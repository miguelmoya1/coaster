package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/catalogue/language_of.sql
	catalogueLanguageOfQuery string
	//go:embed queries/catalogue/find_categories_by_name.sql
	findCategoriesByNameQuery string
	//go:embed queries/catalogue/product_names.sql
	catalogueProductNamesQuery string
)

type CatalogueRepository struct {
	pool *pgxpool.Pool
}

func NewCatalogueRepository(pool *pgxpool.Pool) *CatalogueRepository {
	return &CatalogueRepository{pool: pool}
}

func (r *CatalogueRepository) LanguageOf(ctx context.Context, establishmentID string) (string, error) {
	var language string
	err := r.pool.QueryRow(ctx, catalogueLanguageOfQuery, establishmentID).Scan(&language)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return language, err
}

func (r *CatalogueRepository) FindCategoriesByName(ctx context.Context, establishmentID string, names []string) ([]domain.CatalogueCategoryName, error) {
	rows, err := r.pool.Query(ctx, findCategoriesByNameQuery, establishmentID, names)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.CatalogueCategoryName, error) {
		var category domain.CatalogueCategoryName
		err := row.Scan(&category.ID, &category.Name)
		return category, err
	})
}

func (r *CatalogueRepository) ProductNames(ctx context.Context, categoryIDs []string) ([]domain.CatalogueProductName, error) {
	rows, err := r.pool.Query(ctx, catalogueProductNamesQuery, categoryIDs)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.CatalogueProductName, error) {
		var product domain.CatalogueProductName
		err := row.Scan(&product.CategoryID, &product.Name)
		return product, err
	})
}

func (r *CatalogueRepository) CreateCategories(ctx context.Context, establishmentID string, categories []domain.NewCatalogueCategory) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, category := range categories {
		_, err := tx.Exec(ctx, insertCategoryQuery,
			uuid.NewV4().String(), establishmentID, category.Name, category.Icon, category.TaxRate,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *CatalogueRepository) CreateProducts(ctx context.Context, products []domain.NewProduct) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, product := range products {
		if _, err := insertProduct(ctx, tx, product); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
