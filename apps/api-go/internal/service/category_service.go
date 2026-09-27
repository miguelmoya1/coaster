package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// CategoryService is the categories module: listing and editing an establishment's categories.
type CategoryService struct {
	categories ports.CategoryRepository
	events     ports.EventPublisher
}

func NewCategoryService(categories ports.CategoryRepository, events ports.EventPublisher) *CategoryService {
	return &CategoryService{categories: categories, events: events}
}

// List is GetCategoriesQuery: the categories not deleted, by name.
func (s *CategoryService) List(ctx context.Context, establishmentID string) ([]domain.Category, error) {
	return s.categories.ListOf(ctx, establishmentID)
}

// Create is CreateCategoryCommand.
func (s *CategoryService) Create(ctx context.Context, establishmentID string, category domain.NewCategory) error {
	created, err := s.categories.Create(ctx, establishmentID, category)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.CategoryCreatedEvent{EstablishmentID: establishmentID, Category: created})
	return nil
}

// Update is UpdateCategoryCommand. A category that was deleted can still be updated, as in Nest.
func (s *CategoryService) Update(ctx context.Context, establishmentID, categoryID string, changes domain.CategoryChanges) error {
	updated, err := s.categories.Update(ctx, establishmentID, categoryID, changes)
	if err != nil {
		return err
	}
	if updated == nil {
		return domain.NotFound(domain.CodeCategoryNotFound)
	}

	s.events.Publish(ctx, domain.CategoryUpdatedEvent{EstablishmentID: establishmentID, Category: *updated})
	return nil
}

// Delete is DeleteCategoryCommand: the category is marked deleted, its products stay.
func (s *CategoryService) Delete(ctx context.Context, establishmentID, categoryID string) error {
	found, err := s.categories.Delete(ctx, establishmentID, categoryID)
	if err != nil {
		return err
	}
	if !found {
		return domain.NotFound(domain.CodeCategoryNotFound)
	}

	s.events.Publish(ctx, domain.CategoryDeletedEvent{EstablishmentID: establishmentID, CategoryID: categoryID})
	return nil
}
