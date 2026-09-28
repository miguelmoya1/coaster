package service

import (
	"context"
	"reflect"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestMenuServiceDraftStartsTheMenu(t *testing.T) {
	english := "en"

	tests := []struct {
		name          string
		establishment *domain.MenuEstablishment
		taken         []string
		wantSlug      string
		wantLanguage  string
		wantErr       string
	}{
		{name: "slugged from the establishment", establishment: &domain.MenuEstablishment{Name: "Bar Pepe"}, wantSlug: "bar-pepe", wantLanguage: "es"},
		{name: "numbered when taken", establishment: &domain.MenuEstablishment{Name: "Bar Pepe"}, taken: []string{"bar-pepe"}, wantSlug: "bar-pepe-2", wantLanguage: "es"},
		{name: "in the establishment language", establishment: &domain.MenuEstablishment{Name: "Bar", Language: &english}, wantSlug: "bar", wantLanguage: "en"},
		{name: "no establishment", wantErr: domain.CodeEstablishmentNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeMenuRepo()
			repo.establishment = tt.establishment
			repo.takenSlugs = tt.taken

			draft, err := NewMenuService(repo).Draft(context.Background(), "est-1")

			if tt.wantErr != "" {
				if !isCatalogError(err, domain.KindNotFound, tt.wantErr) {
					t.Fatalf("err = %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if draft.Slug != tt.wantSlug || draft.DefaultLanguage != tt.wantLanguage || !reflect.DeepEqual(draft.Languages, []string{tt.wantLanguage}) {
				t.Errorf("draft = %+v", draft)
			}
			if !draft.HasUnpublishedChanges || len(draft.Sections) != 0 {
				t.Errorf("a new draft = %+v", draft)
			}
		})
	}
}

func TestMenuServiceSaveDraft(t *testing.T) {
	productID := "prod-1"
	hidden := false

	input := domain.SaveMenuDraftInput{
		Name:      "  Carta  ",
		Languages: []string{"es", "en", "es"},
		Sections: []domain.MenuSectionInput{{
			Translations: map[string]any{"es": map[string]any{"name": " Cafetería "}, "de": map[string]any{"name": "Kaffee"}},
			Items: []domain.MenuItemInput{
				{ProductID: &productID, Translations: map[string]any{"en": map[string]any{"name": "Coffee"}}},
				{IsVisible: &hidden, Translations: map[string]any{}},
			},
		}},
	}

	tests := []struct {
		name     string
		change   func(input *domain.SaveMenuDraftInput, repo *fakeMenuRepo)
		wantKind domain.ErrorKind
		wantCode string
	}{
		{name: "saves"},
		{
			name:     "no menu yet",
			change:   func(_ *domain.SaveMenuDraftInput, repo *fakeMenuRepo) { delete(repo.menus, "est-1") },
			wantKind: domain.KindNotFound, wantCode: domain.CodeMenuNotFound,
		},
		{
			name:     "dropping the default language",
			change:   func(input *domain.SaveMenuDraftInput, _ *fakeMenuRepo) { input.Languages = []string{"en"} },
			wantKind: domain.KindBadRequest, wantCode: domain.CodeMenuLanguageNotOffered,
		},
		{
			name:     "a product of another establishment",
			change:   func(_ *domain.SaveMenuDraftInput, repo *fakeMenuRepo) { repo.ownedProducts = nil },
			wantKind: domain.KindNotFound, wantCode: domain.CodeProductNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeMenuRepo()
			repo.menus["est-1"] = &domain.Menu{ID: "menu-1", DefaultLanguage: "es", Languages: []string{"es"}}
			repo.ownedProducts = []string{"prod-1"}
			sent := input
			if tt.change != nil {
				tt.change(&sent, repo)
			}

			draft, err := NewMenuService(repo).SaveDraft(context.Background(), "est-1", sent)

			if tt.wantCode != "" {
				if !isCatalogError(err, tt.wantKind, tt.wantCode) {
					t.Fatalf("err = %v, want %s", err, tt.wantCode)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if repo.savedName != "Carta" || !reflect.DeepEqual(repo.savedLangs, []string{"es", "en"}) {
				t.Errorf("saved name %q, languages %v", repo.savedName, repo.savedLangs)
			}

			section := draft.Sections[0]
			if !reflect.DeepEqual(section.Translations, domain.MenuTranslations{"es": {Name: "Cafetería"}}) {
				t.Errorf("section translations = %+v", section.Translations)
			}
			if !section.Items[0].IsVisible || section.Items[1].IsVisible {
				t.Errorf("visibility = %v, %v; a line is visible unless it says otherwise", section.Items[0].IsVisible, section.Items[1].IsVisible)
			}
			if *section.Items[0].ProductID != "prod-1" || section.Items[0].Translations["en"].Name != "Coffee" {
				t.Errorf("first line = %+v", section.Items[0])
			}
		})
	}
}

func TestMenuServicePublishAndUnpublish(t *testing.T) {
	repo := newFakeMenuRepo()
	menus := NewMenuService(repo)

	if err := menus.Publish(context.Background(), "est-1"); !isCatalogError(err, domain.KindNotFound, domain.CodeMenuNotFound) {
		t.Fatalf("publish without a menu: %v", err)
	}

	repo.menus["est-1"] = &domain.Menu{ID: "menu-1", Name: "Carta", DefaultLanguage: "es", Languages: []string{"es", "en"}}

	if err := menus.Publish(context.Background(), "est-1"); err != nil {
		t.Fatal(err)
	}
	if len(repo.published) != 2 || repo.published["en"].Language != "en" {
		t.Errorf("snapshot = %+v", repo.published)
	}

	if err := menus.Unpublish(context.Background(), "est-1"); err != nil || !repo.unpublished {
		t.Fatalf("unpublish: %v", err)
	}
}

func TestMenuServicePublished(t *testing.T) {
	productID := "prod-1"
	snapshot := func() map[string]domain.PublishedMenu {
		return map[string]domain.PublishedMenu{
			"es": {Name: "Carta", Language: "es", Sections: []domain.PublishedMenuSection{{Name: "Cafetería", Items: []domain.PublishedMenuItem{
				{Name: "Café", ProductID: &productID}, {Name: "Agua"},
			}}}},
			"en": {Name: "Carta", Language: "en", Sections: []domain.PublishedMenuSection{{Name: "Coffee", Items: []domain.PublishedMenuItem{
				{Name: "Coffee", ProductID: &productID},
			}}}},
		}
	}

	tests := []struct {
		name         string
		page         *domain.PublishedMenuPage
		language     string
		wantSection  string
		wantSoldOut  []*bool
		wantNotFound bool
	}{
		{name: "unknown slug", wantNotFound: true},
		{name: "not published", page: &domain.PublishedMenuPage{DefaultLanguage: "es"}, wantNotFound: true},
		{name: "the language asked for", page: &domain.PublishedMenuPage{Snapshot: snapshot(), DefaultLanguage: "es"}, language: "en", wantSection: "Coffee", wantSoldOut: []*bool{nil}},
		{name: "an unknown language", page: &domain.PublishedMenuPage{Snapshot: snapshot(), DefaultLanguage: "es"}, language: "de", wantSection: "Cafetería", wantSoldOut: []*bool{nil, nil}},
		{
			name:        "with what has run out",
			page:        &domain.PublishedMenuPage{Snapshot: snapshot(), DefaultLanguage: "es", MarkSoldOut: true},
			wantSection: "Cafetería",
			wantSoldOut: []*bool{catalogBool(true), catalogBool(false)},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeMenuRepo()
			repo.page = tt.page
			repo.soldOut = map[string]bool{"prod-1": true}

			menu, err := NewMenuService(repo).Published(context.Background(), "bar-pepe", tt.language)

			if tt.wantNotFound {
				if !isCatalogError(err, domain.KindNotFound, domain.CodeMenuNotFound) {
					t.Fatalf("err = %v, want a 404", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if menu.Sections[0].Name != tt.wantSection {
				t.Errorf("section = %q, want %q", menu.Sections[0].Name, tt.wantSection)
			}

			var soldOut []*bool
			for _, item := range menu.Sections[0].Items {
				soldOut = append(soldOut, item.SoldOut)
			}
			if !reflect.DeepEqual(soldOut, tt.wantSoldOut) {
				t.Errorf("soldOut = %v, want %v", soldOut, tt.wantSoldOut)
			}
		})
	}
}

func catalogBool(value bool) *bool { return &value }
