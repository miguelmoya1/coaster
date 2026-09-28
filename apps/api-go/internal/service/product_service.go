package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type ProductService struct {
	products ports.ProductRepository
	events   ports.EventPublisher
}

func NewProductService(products ports.ProductRepository, events ports.EventPublisher) *ProductService {
	return &ProductService{products: products, events: events}
}

func (s *ProductService) List(ctx context.Context, establishmentID string) ([]domain.Product, error) {
	rows, err := s.products.ListOf(ctx, establishmentID)
	if err != nil {
		return nil, err
	}

	products := make([]domain.Product, 0, len(rows))
	for _, row := range rows {
		products = append(products, row.ToProduct())
	}
	return products, nil
}

func (s *ProductService) Create(ctx context.Context, establishmentID string, input domain.CreateProductInput) error {
	if err := s.checkCategory(ctx, input.CategoryID, establishmentID); err != nil {
		return err
	}

	allergens := input.Allergens
	if allergens == nil {
		allergens = []string{}
	}

	row, err := s.products.Create(ctx, domain.NewProduct{
		CategoryID:    input.CategoryID,
		Name:          input.Name,
		Price:         intOrZero(input.Price),
		CurrentStock:  intOrZero(input.CurrentStock),
		MinStockAlert: intOrZero(input.MinStockAlert),
		ImageURL:      input.ImageURL,
		Icon:          input.Icon,
		Allergens:     allergens,
		TaxRate:       input.OwnTaxRate,
	})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ProductCreatedEvent{EstablishmentID: establishmentID, Product: row.ToProduct()})
	return nil
}

func (s *ProductService) Update(ctx context.Context, establishmentID, productID string, changes domain.ProductChanges) error {
	if err := s.checkProduct(ctx, productID, establishmentID); err != nil {
		return err
	}

	if changes.CategoryID != nil && *changes.CategoryID != "" {
		if err := s.checkCategory(ctx, *changes.CategoryID, establishmentID); err != nil {
			return err
		}
	}

	row, err := s.products.Update(ctx, productID, changes)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ProductUpdatedEvent{EstablishmentID: establishmentID, Product: row.ToProduct()})
	return nil
}

func (s *ProductService) SetStock(ctx context.Context, establishmentID, productID string, stock int) error {
	if err := s.checkProduct(ctx, productID, establishmentID); err != nil {
		return err
	}

	row, err := s.products.Update(ctx, productID, domain.ProductChanges{CurrentStock: &stock})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ProductStockChangedEvent{EstablishmentID: establishmentID, Product: row.ToProduct()})
	return nil
}

func (s *ProductService) AdjustStock(ctx context.Context, establishmentID, productID string, delta int) error {
	if err := s.checkProduct(ctx, productID, establishmentID); err != nil {
		return err
	}

	row, err := s.products.AdjustStock(ctx, productID, delta)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ProductStockChangedEvent{EstablishmentID: establishmentID, Product: row.ToProduct()})
	return nil
}

func (s *ProductService) Delete(ctx context.Context, establishmentID, productID string) error {
	if err := s.checkProduct(ctx, productID, establishmentID); err != nil {
		return err
	}

	if err := s.products.Delete(ctx, productID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.ProductDeletedEvent{EstablishmentID: establishmentID, ProductID: productID})
	return nil
}

func (s *ProductService) checkProduct(ctx context.Context, productID, establishmentID string) error {
	belongs, err := s.products.ProductBelongsTo(ctx, productID, establishmentID)
	if err != nil {
		return err
	}
	if !belongs {
		return domain.NotFound(domain.CodeProductNotFound)
	}
	return nil
}

func (s *ProductService) checkCategory(ctx context.Context, categoryID, establishmentID string) error {
	belongs, err := s.products.CategoryBelongsTo(ctx, categoryID, establishmentID)
	if err != nil {
		return err
	}
	if !belongs {
		return domain.Forbidden(domain.CodeCategoryNotFound)
	}
	return nil
}

func intOrZero(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}
