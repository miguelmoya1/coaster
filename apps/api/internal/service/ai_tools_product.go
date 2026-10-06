package service

import (
	"context"
	"strings"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type listProductsInput struct {
	LowStockOnly *bool   `json:"lowStockOnly,omitempty" jsonschema_description:"When true, return only products whose current stock is at or below their minimum stock alert."`
	Search       *string `json:"search,omitempty" jsonschema_description:"Optional case-insensitive filter on the product name."`
}

type createProductInput struct {
	Name          string  `json:"name" jsonschema_description:"Name of the new product, e.g. \"Tarta de queso\"."`
	CategoryID    string  `json:"categoryId" jsonschema_description:"The UUID of the category this product belongs to. Match it in the available categories list."`
	Price         float64 `json:"price" jsonschema:"minimum=0" jsonschema_description:"Price of the product in Euros, e.g. 2.50."`
	CurrentStock  *int    `json:"currentStock,omitempty" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"Initial stock quantity. Defaults to 0."`
	MinStockAlert *int    `json:"minStockAlert,omitempty" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"Stock level that should trigger a low alert."`
}

type updateProductInput struct {
	ProductID     string   `json:"productId" jsonschema_description:"The UUID of the product to update."`
	Name          *string  `json:"name,omitempty" jsonschema_description:"New name of the product."`
	CategoryID    *string  `json:"categoryId,omitempty" jsonschema_description:"New Category UUID of the product."`
	Price         *float64 `json:"price,omitempty" jsonschema_description:"New price of the product in Euros (e.g. 2.50)."`
	MinStockAlert *int     `json:"minStockAlert,omitempty" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"Minimum stock level to trigger an alert."`
}

type updateProductStockInput struct {
	ProductID    string `json:"productId" jsonschema_description:"The UUID of the product to update stock for."`
	CurrentStock int    `json:"currentStock" jsonschema:"minimum=0,maximum=9007199254740991" jsonschema_description:"The new current stock quantity."`
}

type adjustProductStockInput struct {
	ProductID string `json:"productId" jsonschema_description:"The UUID of the product to adjust."`
	Delta     int    `json:"delta" jsonschema:"minimum=-9007199254740991,maximum=9007199254740991" jsonschema_description:"Positive to add stock (a delivery arrived), negative to subtract it (breakage, waste)."`
}

type deleteProductInput struct {
	ProductID string `json:"productId" jsonschema_description:"The UUID of the product to delete."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the deletion in a previous turn."`
}

type aiProduct struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Price         float64 `json:"price"`
	CurrentStock  int     `json:"currentStock"`
	MinStockAlert int     `json:"minStockAlert"`
	CategoryID    string  `json:"categoryId"`
}

func (s *AIService) productTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listProducts",
			`List the products of the establishment with their UUID, price in euros, current stock and minimum stock alert. Use lowStockOnly to answer questions like "¿qué productos están bajo mínimos?" or "¿de qué me estoy quedando sin stock?".`,
			func(ctx context.Context, input listProductsInput) domain.AIToolResult {
				needle := ""
				if input.Search != nil {
					needle = strings.ToLower(strings.TrimSpace(*input.Search))
				}
				lowStockOnly := input.LowStockOnly != nil && *input.LowStockOnly

				return aiQuery(tc, domain.PermissionViewProducts,
					func() ([]domain.Product, error) { return s.products.List(ctx, tc.establishmentID) },
					func(products []domain.Product) any {
						listed := []aiProduct{}
						for _, product := range products {
							if needle != "" && !strings.Contains(strings.ToLower(product.Name), needle) {
								continue
							}
							if lowStockOnly && product.CurrentStock > product.MinStockAlert {
								continue
							}
							listed = append(listed, aiProduct{
								ID:            product.ID,
								Name:          product.Name,
								Price:         toEuros(product.Price),
								CurrentStock:  product.CurrentStock,
								MinStockAlert: product.MinStockAlert,
								CategoryID:    product.CategoryID,
							})
						}
						return listed
					})
			}),

		newAITool("createProduct", "Create a new product in the establishment menu. The category must already exist.",
			func(ctx context.Context, input createProductInput) domain.AIToolResult {
				known := false
				for _, category := range tc.categories {
					if category.ID == input.CategoryID {
						known = true
						break
					}
				}
				if !known {
					return aiFailed("That category does not exist in this establishment. Create it first or pick an existing one.")
				}

				price := toCents(input.Price)
				return tc.execute(domain.PermissionCreateProduct, nil, func() error {
					return s.products.Create(ctx, tc.establishmentID, domain.CreateProductInput{
						Name:          input.Name,
						CategoryID:    input.CategoryID,
						Price:         &price,
						CurrentStock:  input.CurrentStock,
						MinStockAlert: input.MinStockAlert,
					})
				})
			}),

		newAITool("updateProduct",
			"Update details of an existing product in the establishment, such as name, categoryId, price (in Euros, e.g. 2.50), or minStockAlert.",
			func(ctx context.Context, input updateProductInput) domain.AIToolResult {
				changes := domain.ProductChanges{
					Name:          input.Name,
					CategoryID:    domain.NilIfEmpty(input.CategoryID),
					MinStockAlert: input.MinStockAlert,
				}
				if input.Price != nil {
					if *input.Price < 0 {
						return aiFailed("The price cannot be negative.")
					}
					price := toCents(*input.Price)
					changes.Price = &price
				}

				return tc.execute(domain.PermissionUpdateProduct, nil, func() error {
					return s.products.Update(ctx, tc.establishmentID, input.ProductID, changes)
				})
			}),

		newAITool("updateProductStock",
			`Set the current stock quantity of a product to an exact value. Use it for "quedan 12 cervezas" or after a stock count.`,
			func(ctx context.Context, input updateProductStockInput) domain.AIToolResult {
				return tc.execute(domain.PermissionUpdateProductStock, nil, func() error {
					return s.products.SetStock(ctx, tc.establishmentID, input.ProductID, input.CurrentStock)
				})
			}),

		newAITool("adjustProductStock",
			`Add or subtract stock relative to the current amount. Use it for "ha entrado un palé de 24 cervezas" (delta 24) or "se han roto 3 vasos" (delta -3).`,
			func(ctx context.Context, input adjustProductStockInput) domain.AIToolResult {
				if input.Delta == 0 {
					return aiFailed("The stock delta cannot be zero.")
				}

				return tc.execute(domain.PermissionUpdateProductStock, nil, func() error {
					return s.products.AdjustStock(ctx, tc.establishmentID, input.ProductID, input.Delta)
				})
			}),

		newAITool("deleteProduct",
			"Permanently delete a product from the establishment menu. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input deleteProductInput) domain.AIToolResult {
				name := input.ProductID
				for _, product := range tc.products {
					if product.ID == input.ProductID {
						name = product.Name
						break
					}
				}

				confirmation := &aiConfirmation{summary: `permanently delete the product "` + name + `" from the menu`, confirmed: input.Confirmed}
				return tc.execute(domain.PermissionDeleteProduct, confirmation, func() error {
					return s.products.Delete(ctx, tc.establishmentID, input.ProductID)
				})
			}),
	}
}
