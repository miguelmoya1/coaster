package service

import (
	"context"
	"errors"
	"slices"
	"strings"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
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

	var offered []string
	for _, language := range input.Languages {
		language = domain.AsLanguage(language)
		if !slices.Contains(offered, language) {
			offered = append(offered, language)
		}
	}

	if !slices.Contains(offered, domain.AsLanguage(menu.DefaultLanguage)) {
		return domain.MenuDraft{}, domain.BadRequest(domain.CodeMenuLanguageNotOffered)
	}

	var referenced []string
	for _, section := range input.Sections {
		for _, item := range section.Items {
			if item.ProductID != nil && *item.ProductID != "" {
				referenced = append(referenced, *item.ProductID)
			}
		}
	}

	if len(referenced) > 0 {
		owned, err := s.menus.ProductsOf(ctx, establishmentID, referenced)
		if err != nil {
			return domain.MenuDraft{}, err
		}

		for _, productID := range referenced {
			if !slices.Contains(owned, productID) {
				return domain.MenuDraft{}, domain.NotFound(domain.CodeProductNotFound)
			}
		}
	}

	sections := make([]domain.MenuSectionDraft, 0, len(input.Sections))
	for _, section := range input.Sections {
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

	saved, err := s.menus.ReplaceDraft(ctx, menu.ID, strings.TrimSpace(input.Name), offered, sections)
	if err != nil {
		return domain.MenuDraft{}, err
	}

	return saved.Draft(), nil
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

	defaultLanguage := domain.AsLanguage(page.DefaultLanguage)

	chosen := defaultLanguage
	if _, ok := page.Snapshot[language]; ok && domain.IsLanguage(language) {
		chosen = language
	}

	published, ok := page.Snapshot[chosen]
	if !ok {
		published, ok = page.Snapshot[defaultLanguage]
	}
	if !ok {
		return domain.PublishedMenu{}, errors.New("the published menu has no version in its default language")
	}

	if !page.MarkSoldOut {
		return published, nil
	}

	var productIDs []string
	for _, section := range published.Sections {
		for _, item := range section.Items {
			if item.ProductID != nil && *item.ProductID != "" {
				productIDs = append(productIDs, *item.ProductID)
			}
		}
	}

	soldOut := map[string]bool{}
	if len(productIDs) > 0 {
		soldOut, err = s.menus.SoldOutAmong(ctx, productIDs)
		if err != nil {
			return domain.PublishedMenu{}, err
		}
	}

	for i := range published.Sections {
		for j := range published.Sections[i].Items {
			item := &published.Sections[i].Items[j]
			isSoldOut := item.ProductID != nil && soldOut[*item.ProductID]
			item.SoldOut = &isSoldOut
		}
	}

	return published, nil
}
