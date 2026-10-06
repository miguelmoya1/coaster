package httpapi

import (
	"net/http"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type MenuHandler struct {
	menus ports.MenuService
}

func NewMenuHandler(menus ports.MenuService) *MenuHandler {
	return &MenuHandler{menus: menus}
}

func (h *MenuHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	inventory := middleware.Modules(domain.ModuleInventory)
	manage := middleware.Permissions(domain.PermissionManageMenu)

	handle(mux, guard, "GET /establishments/{establishmentId}/menu", h.draft,
		middleware.Permissions(domain.PermissionViewProducts), inventory)
	handle(mux, guard, "PUT /establishments/{establishmentId}/menu", h.saveDraft, manage, inventory)
	handle(mux, guard, "POST /establishments/{establishmentId}/menu/publish", h.publish, manage, inventory)
	handle(mux, guard, "POST /establishments/{establishmentId}/menu/unpublish", h.unpublish, manage, inventory)

	handle(mux, guard, "GET /menus/{slug}", h.published, middleware.Throttle(60, time.Minute))
}

type saveMenuDraftRequest struct {
	Name      string               `json:"name" validate:"max=80"`
	Languages []string             `json:"languages" validate:"min=1,dive,oneof=es en" msg:"min=languages should not be empty"`
	Sections  []menuSectionRequest `json:"sections" validate:"dive"`
}

type menuSectionRequest struct {
	Translations map[string]any    `json:"translations"`
	Items        []menuItemRequest `json:"items" validate:"dive"`
}

type menuItemRequest struct {
	ProductID    *string        `json:"productId" validate:"omitnil,uuid"`
	Price        *int           `json:"price" validate:"omitnil,min=0"`
	IsVisible    *bool          `json:"isVisible" validate:"omitnil"`
	Translations map[string]any `json:"translations"`
}

func (h *MenuHandler) draft(w http.ResponseWriter, r *http.Request) {
	draft, err := h.menus.Draft(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, draft)
}

func (h *MenuHandler) saveDraft(w http.ResponseWriter, r *http.Request) {
	var input saveMenuDraftRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	sections := make([]domain.MenuSectionInput, 0, len(input.Sections))
	for _, section := range input.Sections {
		items := make([]domain.MenuItemInput, 0, len(section.Items))
		for _, item := range section.Items {
			items = append(items, domain.MenuItemInput{
				ProductID:    item.ProductID,
				Price:        item.Price,
				IsVisible:    item.IsVisible,
				Translations: item.Translations,
			})
		}
		sections = append(sections, domain.MenuSectionInput{Translations: section.Translations, Items: items})
	}

	draft, err := h.menus.SaveDraft(r.Context(), r.PathValue("establishmentId"), domain.SaveMenuDraftInput{
		Name:      input.Name,
		Languages: input.Languages,
		Sections:  sections,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, draft)
}

func (h *MenuHandler) publish(w http.ResponseWriter, r *http.Request) {
	if err := h.menus.Publish(r.Context(), r.PathValue("establishmentId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *MenuHandler) unpublish(w http.ResponseWriter, r *http.Request) {
	if err := h.menus.Unpublish(r.Context(), r.PathValue("establishmentId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *MenuHandler) published(w http.ResponseWriter, r *http.Request) {
	menu, err := h.menus.Published(r.Context(), r.PathValue("slug"), r.URL.Query().Get("lang"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, menu)
}
