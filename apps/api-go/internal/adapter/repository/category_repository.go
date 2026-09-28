package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/category/list_of.sql
	listCategoriesQuery string
	//go:embed queries/category/insert.sql
	insertCategoryQuery string
	//go:embed queries/category/update.sql
	updateCategoryQuery string
	//go:embed queries/category/soft_delete.sql
	softDeleteCategoryQuery string
)

type CategoryRepository struct {
	pool *pgxpool.Pool
}

func NewCategoryRepository(pool *pgxpool.Pool) *CategoryRepository {
	return &CategoryRepository{pool: pool}
}

func (r *CategoryRepository) ListOf(ctx context.Context, establishmentID string) ([]domain.Category, error) {
	rows, err := r.pool.Query(ctx, listCategoriesQuery, establishmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []domain.Category{}
	for rows.Next() {
		category, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		categories = append(categories, *category)
	}

	return categories, rows.Err()
}

func (r *CategoryRepository) Create(ctx context.Context, establishmentID string, category domain.NewCategory) (domain.Category, error) {
	taxRate := domain.DefaultTaxRate
	if category.TaxRate != nil {
		taxRate = *category.TaxRate
	}

	created, err := scanCategory(r.pool.QueryRow(ctx, insertCategoryQuery,
		uuid.NewV4().String(), establishmentID, category.Name, category.Icon, taxRate,
	))
	if err != nil {
		return domain.Category{}, err
	}

	return *created, nil
}

func (r *CategoryRepository) Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) (*domain.Category, error) {
	updated, err := scanCategory(r.pool.QueryRow(ctx, updateCategoryQuery,
		categoryID, establishmentID, changes.Name, changes.Icon, changes.ClearIcon, changes.TaxRate,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return updated, err
}

func (r *CategoryRepository) Delete(ctx context.Context, establishmentID, categoryID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, softDeleteCategoryQuery, categoryID, establishmentID, now())
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func scanCategory(row pgx.Row) (*domain.Category, error) {
	var category domain.Category
	err := row.Scan(&category.ID, &category.EstablishmentID, &category.Name, &category.Icon, &category.TaxRate)
	if err != nil {
		return nil, err
	}
	return &category, nil
}
