package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// The inputs of the table tools (table.tools.ts).

type createTableInput struct {
	Name string `json:"name" jsonschema_description:"Table name or designation to create, e.g. 'Mesa 4', 'Terraza 1'. Use the exact name mentioned by the user."`
}

type updateTableInput struct {
	TableID string `json:"tableId" jsonschema_description:"The UUID of the table to update."`
	Name    string `json:"name" jsonschema_description:"New name of the table."`
}

type deleteTableInput struct {
	TableID   string `json:"tableId" jsonschema_description:"The UUID of the table to delete."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the deletion in a previous turn."`
}

// aiTable is a table as listTables shows it.
type aiTable struct {
	ID     string             `json:"id"`
	Name   string             `json:"name"`
	Status domain.TableStatus `json:"status"`
}

func (s *AIService) tableTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listTables",
			"List every table of the establishment with its UUID and status. Use it to refresh the table list or when a table the user mentions is not in the context above.",
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewTables,
					func() ([]domain.Table, error) { return s.tables.List(ctx, tc.establishmentID) },
					func(tables []domain.Table) any {
						listed := make([]aiTable, 0, len(tables))
						for _, table := range tables {
							listed = append(listed, aiTable{ID: table.ID, Name: table.Name, Status: table.Status})
						}
						return listed
					})
			}),

		newAITool("createTable", "Create a new table in the establishment.",
			func(ctx context.Context, input createTableInput) domain.AIToolResult {
				return tc.execute(domain.PermissionCreateTable, nil, func() error {
					return s.tables.Create(ctx, tc.establishmentID, input.Name)
				})
			}),

		newAITool("updateTable", "Update details of an existing table in the establishment, such as its name.",
			func(ctx context.Context, input updateTableInput) domain.AIToolResult {
				return tc.execute(domain.PermissionUpdateTable, nil, func() error {
					return s.tables.Update(ctx, tc.establishmentID, input.TableID, &input.Name)
				})
			}),

		newAITool("deleteTable",
			"Permanently delete a table from the establishment. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input deleteTableInput) domain.AIToolResult {
				name := input.TableID
				for _, table := range tc.tables {
					if table.ID == input.TableID {
						name = table.Name
						break
					}
				}

				confirmation := &aiConfirmation{summary: `permanently delete the table "` + name + `"`, confirmed: input.Confirmed}
				return tc.execute(domain.PermissionDeleteTable, confirmation, func() error {
					return s.tables.Delete(ctx, tc.establishmentID, input.TableID)
				})
			}),
	}
}
