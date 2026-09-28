package service

import (
	"context"
	"reflect"
	"testing"

	"coaster-api/internal/core/domain"
)

func productRepoWithBeer() *fakeProductRepo {
	repo := newFakeProductRepo()
	repo.products["prod-1"] = domain.ProductRow{ID: "prod-1", CategoryID: "cat-1", Name: "Beer", CurrentStock: 10, Allergens: []string{}}
	repo.products["prod-other"] = domain.ProductRow{ID: "prod-other", CategoryID: "cat-other", Name: "Theirs", Allergens: []string{}}
	return repo
}

func TestProductServiceCreate(t *testing.T) {
	price, ownRate := 250, 2100

	tests := []struct {
		name      string
		input     domain.CreateProductInput
		wantErr   bool
		wantSaved domain.NewProduct
	}{
		{
			name:  "fills the defaults",
			input: domain.CreateProductInput{Name: "Beer", CategoryID: "cat-1"},
			wantSaved: domain.NewProduct{
				CategoryID: "cat-1", Name: "Beer", Allergens: []string{},
			},
		},
		{
			name:  "keeps what was sent, with ownTaxRate as the product's rate",
			input: domain.CreateProductInput{Name: "Beer", CategoryID: "cat-1", Price: &price, Allergens: []string{"GLUTEN"}, OwnTaxRate: &ownRate},
			wantSaved: domain.NewProduct{
				CategoryID: "cat-1", Name: "Beer", Price: 250, Allergens: []string{"GLUTEN"}, TaxRate: &ownRate,
			},
		},
		{
			name:    "refuses a category of another establishment",
			input:   domain.CreateProductInput{Name: "Beer", CategoryID: "cat-other"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeProductRepo()
			events := &catalogEvents{}

			err := NewProductService(repo, events).Create(context.Background(), "est-1", tt.input)

			if tt.wantErr {
				if !isCatalogError(err, domain.KindForbidden, domain.CodeCategoryNotFound) || len(events.events) != 0 {
					t.Fatalf("err = %v, events %+v; want a 403 CATEGORY_NOT_FOUND", err, events.events)
				}
				return
			}

			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(repo.created, tt.wantSaved) {
				t.Errorf("saved %+v\nwant  %+v", repo.created, tt.wantSaved)
			}
			if len(events.events) != 1 || events.events[0].Name() != "ProductCreatedEvent" {
				t.Errorf("events = %+v", events.events)
			}
		})
	}
}

func TestProductServiceWritesCheckTheProduct(t *testing.T) {
	name := "Lager"
	otherCategory := "cat-other"

	tests := []struct {
		name      string
		productID string
		run       func(s *ProductService, productID string) error
		wantKind  domain.ErrorKind
		wantCode  string
		wantEvent string
	}{
		{
			name: "update", productID: "prod-1",
			run: func(s *ProductService, id string) error {
				return s.Update(context.Background(), "est-1", id, domain.ProductChanges{Name: &name})
			},
			wantEvent: "ProductUpdatedEvent",
		},
		{
			name: "update another establishment's product", productID: "prod-other",
			run: func(s *ProductService, id string) error {
				return s.Update(context.Background(), "est-1", id, domain.ProductChanges{Name: &name})
			},
			wantKind: domain.KindNotFound, wantCode: domain.CodeProductNotFound,
		},
		{
			name: "move to another establishment's category", productID: "prod-1",
			run: func(s *ProductService, id string) error {
				return s.Update(context.Background(), "est-1", id, domain.ProductChanges{CategoryID: &otherCategory})
			},
			wantKind: domain.KindForbidden, wantCode: domain.CodeCategoryNotFound,
		},
		{
			name: "set the stock", productID: "prod-1",
			run:       func(s *ProductService, id string) error { return s.SetStock(context.Background(), "est-1", id, 5) },
			wantEvent: "ProductStockChangedEvent",
		},
		{
			name: "set the stock of a missing product", productID: "nope",
			run:      func(s *ProductService, id string) error { return s.SetStock(context.Background(), "est-1", id, 5) },
			wantKind: domain.KindNotFound, wantCode: domain.CodeProductNotFound,
		},
		{
			name: "adjust the stock", productID: "prod-1",
			run:       func(s *ProductService, id string) error { return s.AdjustStock(context.Background(), "est-1", id, -2) },
			wantEvent: "ProductStockChangedEvent",
		},
		{
			name: "adjust the stock of another establishment's product", productID: "prod-other",
			run:      func(s *ProductService, id string) error { return s.AdjustStock(context.Background(), "est-1", id, -2) },
			wantKind: domain.KindNotFound, wantCode: domain.CodeProductNotFound,
		},
		{
			name: "delete", productID: "prod-1",
			run:       func(s *ProductService, id string) error { return s.Delete(context.Background(), "est-1", id) },
			wantEvent: "ProductDeletedEvent",
		},
		{
			name: "delete a missing product", productID: "nope",
			run:      func(s *ProductService, id string) error { return s.Delete(context.Background(), "est-1", id) },
			wantKind: domain.KindNotFound, wantCode: domain.CodeProductNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			events := &catalogEvents{}

			err := tt.run(NewProductService(productRepoWithBeer(), events), tt.productID)

			if tt.wantCode != "" {
				if !isCatalogError(err, tt.wantKind, tt.wantCode) || len(events.events) != 0 {
					t.Fatalf("err = %v, events %+v; want %s", err, events.events, tt.wantCode)
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

func TestProductServiceStockEvents(t *testing.T) {
	repo := productRepoWithBeer()
	events := &catalogEvents{}
	products := NewProductService(repo, events)

	if err := products.AdjustStock(context.Background(), "est-1", "prod-1", -3); err != nil {
		t.Fatal(err)
	}
	if err := products.SetStock(context.Background(), "est-1", "prod-1", 20); err != nil {
		t.Fatal(err)
	}

	var stocks []int
	for _, event := range events.events {
		stocks = append(stocks, event.(domain.ProductStockChangedEvent).Product.CurrentStock)
	}
	if !reflect.DeepEqual(stocks, []int{7, 20}) {
		t.Errorf("stocks sent = %v, want [7 20]", stocks)
	}
}

func TestProductServiceList(t *testing.T) {
	repo := productRepoWithBeer()
	repo.categoryTaxRateFor = map[string]int{"cat-1": 2100}

	products, err := NewProductService(repo, &catalogEvents{}).List(context.Background(), "est-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(products) != 1 || products[0].ID != "prod-1" || products[0].TaxRate != 2100 || products[0].OwnTaxRate != nil {
		t.Errorf("List = %+v", products)
	}
}
