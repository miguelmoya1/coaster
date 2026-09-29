package service

import (
	"context"
	"errors"
	"slices"
	"strings"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type MenuService struct {
	menus ports.MenuRepository
}

func NewMenuService(menus ports.MenuRepository) *MenuService {
	return &MenuService{menus: menus}
}

func (s *MenuService) Draft(ctx context.Context, establishmentID string) (domain.MenuDraft, error) {
	existing, err := s.menus.FindByEstablishment(ctx, establishmentID)
	if err != nil {
		return domain.MenuDraft{}, err
	}
	if existing != nil {
		return existing.Draft(), nil
	}

	establishment, err := s.menus.EstablishmentFor(ctx, establishmentID)
	if err != nil {
		return domain.MenuDraft{}, err
	}
	if establishment == nil {
		return domain.MenuDraft{}, domain.NotFound(domain.CodeEstablishmentNotFound)
	}

	root := domain.Slugify(establishment.Name)
	if root == "" {
		root = "menu"
	}

	taken, err := s.menus.TakenSlugs(ctx, root)
	if err != nil {
		return domain.MenuDraft{}, err
	}

	language := domain.DefaultLanguage
	if establishment.Language != nil {
		language = domain.AsLanguage(*establishment.Language)
	}

	created, err := s.menus.Create(ctx, establishmentID, domain.NextMenuSlug(establishment.Name, taken), establishment.Name, language)
	if err != nil {
		return domain.MenuDraft{}, err
	}

	return created.Draft(), nil
}

func (s *MenuService) SaveDraft(ctx context.Context, establishmentID string, input domain.SaveMenuDraftInput) (domain.MenuDraft, error) {
	menu, err := s.menus.FindByEstablishment(ctx, establishmentID)
	if err != nil {
		return domain.MenuDraft{}, err
	}
	if menu == nil {
		return domain.MenuDraft{}, domain.NotFound(domain.CodeMenuNotFound)
	}

	offered := offeredLanguages(input.Languages)
	if !slices.Contains(offered, domain.AsLanguage(menu.DefaultLanguage)) {
		return domain.MenuDraft{}, domain.BadRequest(domain.CodeMenuLanguageNotOffered)
	}

	if err := s.checkOwnedProducts(ctx, establishmentID, input.ProductIDs()); err != nil {
		return domain.MenuDraft{}, err
	}

	saved, err := s.menus.ReplaceDraft(ctx, menu.ID, strings.TrimSpace(input.Name), offered, draftSections(input.Sections, offered))
	if err != nil {
		return domain.MenuDraft{}, err
	}

	return saved.Draft(), nil
}

func offeredLanguages(languages []string) []string {
	var offered []string
	for _, language := range languages {
		language = domain.AsLanguage(language)
		if !slices.Contains(offered, language) {
			offered = append(offered, language)
		}
	}
	return offered
}

func (s *MenuService) checkOwnedProducts(ctx context.Context, establishmentID string, productIDs []string) error {
	if len(productIDs) == 0 {
		return nil
	}

	owned, err := s.menus.ProductsOf(ctx, establishmentID, productIDs)
	if err != nil {
		return err
	}

	for _, productID := range productIDs {
		if !slices.Contains(owned, productID) {
			return domain.NotFound(domain.CodeProductNotFound)
		}
	}
	return nil
}

func draftSections(inputs []domain.MenuSectionInput, offered []string) []domain.MenuSectionDraft {
	sections := make([]domain.MenuSectionDraft, 0, len(inputs))
	for _, section := range inputs {
		items := make([]domain.MenuItemDraft, 0, len(section.Items))
		for _, item := range section.Items {
			items = append(items, domain.MenuItemDraft{
				ProductID:    item.ProductID,
				Price:        item.Price,
				IsVisible:    item.IsVisible == nil || *item.IsVisible,
				Translations: domain.SanitiseTranslations(item.Translations, offered),
			})
		}

		sections = append(sections, domain.MenuSectionDraft{
			Translations: domain.SanitiseTranslations(section.Translations, offered),
			Items:        items,
		})
	}
	return sections
}
func (s *MenuService) Publish(ctx context.Context, establishmentID string) error {
	menu, err := s.menus.FindByEstablishment(ctx, establishmentID)
	if err != nil {
		return err
	}
	if menu == nil {
		return domain.NotFound(domain.CodeMenuNotFound)
	}

	return s.menus.Publish(ctx, menu.ID, menu.RenderEveryLanguage())
}

func (s *MenuService) Unpublish(ctx context.Context, establishmentID string) error {
	menu, err := s.menus.FindByEstablishment(ctx, establishmentID)
	if err != nil {
		return err
	}
	if menu == nil {
		return domain.NotFound(domain.CodeMenuNotFound)
	}

	return s.menus.Unpublish(ctx, menu.ID)
}

func (s *MenuService) Published(ctx context.Context, slug, language string) (domain.PublishedMenu, error) {
	page, err := s.menus.FindPublishedBySlug(ctx, slug)
	if err != nil {
		return domain.PublishedMenu{}, err
	}
	if page == nil || page.Snapshot == nil {
		return domain.PublishedMenu{}, domain.NotFound(domain.CodeMenuNotFound)
	}

	published, ok := page.In(language)
	if !ok {
		return domain.PublishedMenu{}, errors.New("the published menu has no version in its default language")
	}

	if page.MarkSoldOut {
		if err := s.markSoldOut(ctx, &published); err != nil {
			return domain.PublishedMenu{}, err
		}
	}
	return published, nil
}

func (s *MenuService) markSoldOut(ctx context.Context, menu *domain.PublishedMenu) error {
	soldOut := map[string]bool{}
	if productIDs := menu.ProductIDs(); len(productIDs) > 0 {
		var err error
		soldOut, err = s.menus.SoldOutAmong(ctx, productIDs)
		if err != nil {
			return err
		}
	}

	for i := range menu.Sections {
		for j := range menu.Sections[i].Items {
			item := &menu.Sections[i].Items[j]
			isSoldOut := item.ProductID != nil && soldOut[*item.ProductID]
			item.SoldOut = &isSoldOut
		}
	}
	return nil
}
