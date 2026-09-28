package service

import (
	"context"
	"strconv"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type createCategoryInput struct {
	Name string  `json:"name" jsonschema_description:"Name of the new category."`
	Icon *string `json:"icon,omitempty" jsonschema_description:"Optional Material Symbols icon name, e.g. \"local_bar\", \"restaurant\", \"cake\"."`
}

type updateCategoryInput struct {
	CategoryID string  `json:"categoryId" jsonschema_description:"The UUID of the category to update."`
	Name       *string `json:"name,omitempty" jsonschema_description:"New name of the category."`
	Icon       *string `json:"icon,omitempty" jsonschema_description:"New icon name of the category."`
}

type deleteCategoryInput struct {
	CategoryID string `json:"categoryId" jsonschema_description:"The UUID of the category to delete."`
	Confirmed  bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the deletion in a previous turn."`
}

type aiCategory struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Icon *string `json:"icon,omitempty"`
}

func (s *AIService) categoryTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listCategories", "List the menu categories of the establishment with their UUID and icon.",
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewCategories,
					func() ([]domain.Category, error) { return s.categories.List(ctx, tc.establishmentID) },
					func(categories []domain.Category) any {
						listed := make([]aiCategory, 0, len(categories))
						for _, category := range categories {
							listed = append(listed, aiCategory{ID: category.ID, Name: category.Name, Icon: category.Icon})
						}
						return listed
					})
			}),

		newAITool("createCategory", `Create a new menu category in the establishment, e.g. "Postres" or "Vinos".`,
			func(ctx context.Context, input createCategoryInput) domain.AIToolResult {
				return tc.execute(domain.PermissionCreateCategory, nil, func() error {
					return s.categories.Create(ctx, tc.establishmentID, domain.NewCategory{Name: input.Name, Icon: input.Icon})
				})
			}),

		newAITool("updateCategory", "Update details of an existing category in the establishment, such as its name or icon.",
			func(ctx context.Context, input updateCategoryInput) domain.AIToolResult {
				var existing *domain.Category
				for _, category := range tc.categories {
					if category.ID == input.CategoryID {
						existing = &category
						break
					}
				}
				if existing == nil {
					return aiFailed("Category not found in this establishment.")
				}

				name := existing.Name
				if input.Name != nil {
					name = *input.Name
				}

				return tc.execute(domain.PermissionUpdateCategory, nil, func() error {
					return s.categories.Update(ctx, tc.establishmentID, input.CategoryID, domain.CategoryChanges{Name: name, Icon: input.Icon})
				})
			}),

		newAITool("deleteCategory",
			"Permanently delete a menu category. Destructive: requires the user to confirm first, and it affects every product inside it.",
			func(ctx context.Context, input deleteCategoryInput) domain.AIToolResult {
				name := input.CategoryID
				for _, category := range tc.categories {
					if category.ID == input.CategoryID {
						name = category.Name
						break
					}
				}

				products := 0
				for _, product := range tc.products {
					if product.CategoryID == input.CategoryID {
						products++
					}
				}

				confirmation := &aiConfirmation{
					summary:   `permanently delete the category "` + name + `", which currently holds ` + strconv.Itoa(products) + " product(s)",
					confirmed: input.Confirmed,
				}
				return tc.execute(domain.PermissionDeleteCategory, confirmation, func() error {
					return s.categories.Delete(ctx, tc.establishmentID, input.CategoryID)
				})
			}),
	}
}
