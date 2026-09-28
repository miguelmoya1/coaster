package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type CategoryService struct {
	categories ports.CategoryRepository
	events     ports.EventPublisher
}

func NewCategoryService(categories ports.CategoryRepository, events ports.EventPublisher) *CategoryService {
	return &CategoryService{categories: categories, events: events}
}

func (s *CategoryService) List(ctx context.Context, establishmentID string) ([]domain.Category, error) {
	return s.categories.ListOf(ctx, establishmentID)
}

func (s *CategoryService) Create(ctx context.Context, establishmentID string, category domain.NewCategory) error {
	created, err := s.categories.Create(ctx, establishmentID, category)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.CategoryCreatedEvent{EstablishmentID: establishmentID, Category: created})
	return nil
}

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
