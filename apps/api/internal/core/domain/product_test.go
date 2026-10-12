package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestResolveTaxRate(t *testing.T) {
	own, category := 400, 2100

	tests := []struct {
		name     string
		product  *int
		category *int
		want     int
	}{
		{name: "the product's own rate", product: &own, category: &category, want: 400},
		{name: "its category's rate", category: &category, want: 2100},
		{name: "the default", want: DefaultTaxRate},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ResolveTaxRate(tt.product, tt.category); got != tt.want {
				t.Errorf("ResolveTaxRate = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestProductRowToProductJSON(t *testing.T) {
	categoryRate := 2100
	row := ProductRow{
		ID: "p1", CategoryID: "c1", Name: "Beer", Price: 250, CurrentStock: 3, MinStockAlert: 1,
		UpdatedAt:       NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)),
		CategoryTaxRate: &categoryRate,
	}

	got, err := json.Marshal(row.ToProduct())
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"p1","categoryId":"c1","name":"Beer","price":250,"currentStock":3,"minStockAlert":1,"taxRate":2100,"allergens":[],"lastUpdated":"2026-09-27T10:00:00.000Z"}`
	if string(got) != want {
		t.Errorf("JSON = %s\nwant   %s", got, want)
	}
}
