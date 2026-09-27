package service

import (
	"context"
	"reflect"
	"testing"

	"api-go/internal/core/domain"
)

func TestCategoryServiceCreate(t *testing.T) {
	repo := &fakeCategoryRepo{}
	events := &catalogEvents{}
	categories := NewCategoryService(repo, events)

	icon := "beer"
	if err := categories.Create(context.Background(), "est-1", domain.NewCategory{Name: "Drinks", Icon: &icon}); err != nil {
		t.Fatal(err)
	}

	want := domain.CategoryCreatedEvent{
		EstablishmentID: "est-1",
		Category:        domain.Category{ID: "cat-new", EstablishmentID: "est-1", Name: "Drinks", Icon: &icon, TaxRate: domain.DefaultTaxRate},
	}
	if len(events.events) != 1 || !reflect.DeepEqual(events.events[0], want) {
		t.Errorf("events = %+v", events.events)
	}
}

func TestCategoryServiceUpdateAndDelete(t *testing.T) {
	tests := []struct {
		name       string
		categoryID string
		run        func(s *CategoryService, categoryID string) error
		wantErr    string
		wantEvent  string
	}{
		{
			name:       "update",
			categoryID: "cat-1",
			run: func(s *CategoryService, id string) error {
				return s.Update(context.Background(), "est-1", id, domain.CategoryChanges{Name: "Food"})
			},
			wantEvent: "CategoryUpdatedEvent",
		},
		{
			name:       "update a category of another establishment",
			categoryID: "cat-other",
			run: func(s *CategoryService, id string) error {
				return s.Update(context.Background(), "est-1", id, domain.CategoryChanges{Name: "Food"})
			},
			wantErr: domain.CodeCategoryNotFound,
		},
		{
			name:       "delete",
			categoryID: "cat-1",
			run:        func(s *CategoryService, id string) error { return s.Delete(context.Background(), "est-1", id) },
			wantEvent:  "CategoryDeletedEvent",
		},
		{
			name:       "delete a category that does not exist",
			categoryID: "nope",
			run:        func(s *CategoryService, id string) error { return s.Delete(context.Background(), "est-1", id) },
			wantErr:    domain.CodeCategoryNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeCategoryRepo{categories: []domain.Category{
				{ID: "cat-1", EstablishmentID: "est-1", Name: "Drinks", TaxRate: 1000},
				{ID: "cat-other", EstablishmentID: "est-2", Name: "Other", TaxRate: 1000},
			}}
			events := &catalogEvents{}

			err := tt.run(NewCategoryService(repo, events), tt.categoryID)

			if tt.wantErr != "" {
				if !isCatalogError(err, domain.KindNotFound, tt.wantErr) {
					t.Fatalf("err = %v, want a 404 %s", err, tt.wantErr)
				}
				if len(events.events) != 0 {
					t.Errorf("published %+v after failing", events.events)
				}
				return
			}

			if err != nil {
				t.Fatal(err)
			}
			if len(events.events) != 1 || events.events[0].Name() != tt.wantEvent {
				t.Errorf("events = %+v, want one %s", events.events, tt.wantEvent)
			}
		})
	}
}

func TestCategoryServiceList(t *testing.T) {
	repo := &fakeCategoryRepo{
		categories: []domain.Category{{ID: "a", EstablishmentID: "est-1"}, {ID: "b", EstablishmentID: "est-1"}},
		deleted:    map[string]bool{"b": true},
	}

	categories, err := NewCategoryService(repo, &catalogEvents{}).List(context.Background(), "est-1")
	if err != nil || len(categories) != 1 || categories[0].ID != "a" {
		t.Fatalf("List = %+v, %v", categories, err)
	}
}
