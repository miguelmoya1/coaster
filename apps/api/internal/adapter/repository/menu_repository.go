package repository

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/menu/find_by_establishment.sql
	findMenuByEstablishmentQuery string
	//go:embed queries/menu/find_by_id.sql
	findMenuByIDQuery string
	//go:embed queries/menu/sections_of.sql
	menuSectionsOfQuery string
	//go:embed queries/menu/items_of.sql
	menuItemsOfQuery string
	//go:embed queries/menu/products_of_items.sql
	menuProductsOfItemsQuery string
	//go:embed queries/menu/establishment_for.sql
	menuEstablishmentForQuery string
	//go:embed queries/menu/taken_slugs.sql
	takenMenuSlugsQuery string
	//go:embed queries/menu/insert.sql
	insertMenuQuery string
	//go:embed queries/menu/delete_sections.sql
	deleteMenuSectionsQuery string
	//go:embed queries/menu/update_draft.sql
	updateMenuDraftQuery string
	//go:embed queries/menu/insert_section.sql
	insertMenuSectionQuery string
	//go:embed queries/menu/insert_item.sql
	insertMenuItemQuery string
	//go:embed queries/menu/publish.sql
	publishMenuQuery string
	//go:embed queries/menu/unpublish.sql
	unpublishMenuQuery string
	//go:embed queries/menu/products_of.sql
	menuProductsOfQuery string
	//go:embed queries/menu/find_published_by_slug.sql
	findPublishedMenuBySlugQuery string
	//go:embed queries/menu/sold_out_among.sql
	soldOutAmongQuery string
)

type MenuRepository struct {
	pool *pgxpool.Pool
}

func NewMenuRepository(pool *pgxpool.Pool) *MenuRepository {
	return &MenuRepository{pool: pool}
}

func (r *MenuRepository) FindByEstablishment(ctx context.Context, establishmentID string) (*domain.Menu, error) {
	return findMenu(ctx, r.pool, findMenuByEstablishmentQuery, establishmentID)
}

func (r *MenuRepository) EstablishmentFor(ctx context.Context, establishmentID string) (*domain.MenuEstablishment, error) {
	var establishment domain.MenuEstablishment
	err := r.pool.QueryRow(ctx, menuEstablishmentForQuery, establishmentID).Scan(&establishment.Name, &establishment.Language)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &establishment, nil
}

func (r *MenuRepository) TakenSlugs(ctx context.Context, root string) ([]string, error) {
	rows, err := r.pool.Query(ctx, takenMenuSlugsQuery, root)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

func (r *MenuRepository) Create(ctx context.Context, establishmentID, slug, name, language string) (*domain.Menu, error) {
	id := uuid.NewV4().String()

	_, err := r.pool.Exec(ctx, insertMenuQuery, id, establishmentID, slug, name, language, []string{language}, now())
	if err != nil {
		return nil, err
	}

	return findMenu(ctx, r.pool, findMenuByIDQuery, id)
}

func (r *MenuRepository) ReplaceDraft(ctx context.Context, menuID, name string, languages []string, sections []domain.MenuSectionDraft) (*domain.Menu, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, deleteMenuSectionsQuery, menuID); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, updateMenuDraftQuery, menuID, name, languages, now()); err != nil {
		return nil, err
	}

	for position, section := range sections {
		sectionID := uuid.NewV4().String()

		_, err := tx.Exec(ctx, insertMenuSectionQuery, sectionID, menuID, position, section.Translations)
		if err != nil {
			return nil, err
		}

		for itemPosition, item := range section.Items {
			_, err := tx.Exec(ctx, insertMenuItemQuery,
				uuid.NewV4().String(), sectionID, item.ProductID, item.Price, itemPosition, item.IsVisible, item.Translations,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	saved, err := findMenu(ctx, tx, findMenuByIDQuery, menuID)
	if err != nil {
		return nil, err
	}
	if saved == nil {
		return nil, errors.New("the menu disappeared while saving its draft")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return saved, nil
}

func (r *MenuRepository) Publish(ctx context.Context, menuID string, snapshot map[string]domain.PublishedMenu) error {
	_, err := r.pool.Exec(ctx, publishMenuQuery, menuID, snapshot, now())
	return err
}

func (r *MenuRepository) Unpublish(ctx context.Context, menuID string) error {
	_, err := r.pool.Exec(ctx, unpublishMenuQuery, menuID, now())
	return err
}

func (r *MenuRepository) ProductsOf(ctx context.Context, establishmentID string, productIDs []string) ([]string, error) {
	rows, err := r.pool.Query(ctx, menuProductsOfQuery, productIDs, establishmentID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

func (r *MenuRepository) FindPublishedBySlug(ctx context.Context, slug string) (*domain.PublishedMenuPage, error) {
	var snapshot []byte
	var page domain.PublishedMenuPage

	err := r.pool.QueryRow(ctx, findPublishedMenuBySlugQuery, slug).Scan(&snapshot, &page.DefaultLanguage, &page.MarkSoldOut)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if snapshot != nil {
		if err := json.Unmarshal(snapshot, &page.Snapshot); err != nil {
			return nil, err
		}
	}

	return &page, nil
}

func (r *MenuRepository) SoldOutAmong(ctx context.Context, productIDs []string) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx, soldOutAmongQuery, productIDs)
	if err != nil {
		return nil, err
	}

	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, err
	}

	soldOut := make(map[string]bool, len(ids))
	for _, id := range ids {
		soldOut[id] = true
	}
	return soldOut, nil
}

type menuReader interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func findMenu(ctx context.Context, db menuReader, query string, arg string) (*domain.Menu, error) {
	var menu domain.Menu
	err := db.QueryRow(ctx, query, arg).Scan(
		&menu.ID, &menu.EstablishmentID, &menu.Slug, &menu.Name, &menu.DefaultLanguage, &menu.Languages,
		&menu.PublishedAt, &menu.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var sectionIDs []string
	menu.Sections, sectionIDs, err = menuSections(ctx, db, menu.ID)
	if err != nil {
		return nil, err
	}

	if len(sectionIDs) == 0 {
		return &menu, nil
	}

	items, err := menuItems(ctx, db, sectionIDs)
	if err != nil {
		return nil, err
	}

	products, err := menuProducts(ctx, db, items)
	if err != nil {
		return nil, err
	}

	placeItems(menu.Sections, sectionIDs, items, products)
	return &menu, nil
}

func menuSections(ctx context.Context, db menuReader, menuID string) ([]domain.MenuSection, []string, error) {
	rows, err := db.Query(ctx, menuSectionsOfQuery, menuID)
	if err != nil {
		return nil, nil, err
	}

	var ids []string
	sections, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.MenuSection, error) {
		var id string
		var section domain.MenuSection
		err := row.Scan(&id, &section.Translations)
		ids = append(ids, id)
		return section, err
	})
	return sections, ids, err
}

func menuItems(ctx context.Context, db menuReader, sectionIDs []string) ([]menuItemRow, error) {
	rows, err := db.Query(ctx, menuItemsOfQuery, sectionIDs)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (menuItemRow, error) {
		var read menuItemRow
		err := row.Scan(&read.sectionID, &read.item.ProductID, &read.item.Price, &read.item.IsVisible, &read.item.Translations)
		return read, err
	})
}

func placeItems(sections []domain.MenuSection, sectionIDs []string, items []menuItemRow, products map[string]*domain.MenuProduct) {
	for i, sectionID := range sectionIDs {
		for _, read := range items {
			if read.sectionID != sectionID {
				continue
			}

			item := read.item
			if item.ProductID != nil {
				item.Product = products[*item.ProductID]
			}
			sections[i].Items = append(sections[i].Items, item)
		}
	}
}

type menuItemRow struct {
	sectionID string
	item      domain.MenuItem
}

func menuProducts(ctx context.Context, db menuReader, items []menuItemRow) (map[string]*domain.MenuProduct, error) {
	var productIDs []string
	for _, read := range items {
		if read.item.ProductID != nil {
			productIDs = append(productIDs, *read.item.ProductID)
		}
	}

	products := make(map[string]*domain.MenuProduct)
	if len(productIDs) == 0 {
		return products, nil
	}

	rows, err := db.Query(ctx, menuProductsOfItemsQuery, productIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var product domain.MenuProduct
		err := rows.Scan(&id, &product.Name, &product.Price, &product.ImageURL, &product.Allergens, &product.DeletedAt, &product.UpdatedAt)
		if err != nil {
			return nil, err
		}
		products[id] = &product
	}

	return products, rows.Err()
}
