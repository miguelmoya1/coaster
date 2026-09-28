package domain

const (
	DefaultTaxRate = 1000
	MaxTaxRate     = 10000
)

var Allergens = []string{
	"GLUTEN", "CRUSTACEANS", "EGGS", "FISH", "PEANUTS", "SOYBEANS", "MILK",
	"NUTS", "CELERY", "MUSTARD", "SESAME", "SULPHITES", "LUPIN", "MOLLUSCS",
}

func ResolveTaxRate(productTaxRate, categoryTaxRate *int) int {
	if productTaxRate != nil {
		return *productTaxRate
	}
	if categoryTaxRate != nil {
		return *categoryTaxRate
	}
	return DefaultTaxRate
}

type Product struct {
	ID            string   `json:"id"`
	CategoryID    string   `json:"categoryId"`
	Name          string   `json:"name"`
	Price         int      `json:"price"`
	CurrentStock  int      `json:"currentStock"`
	MinStockAlert int      `json:"minStockAlert"`
	ImageURL      *string  `json:"imageUrl,omitempty"`
	Icon          *string  `json:"icon,omitempty"`
	TaxRate       int      `json:"taxRate"`
	OwnTaxRate    *int     `json:"ownTaxRate,omitempty"`
	Allergens     []string `json:"allergens"`
	LastUpdated   Time     `json:"lastUpdated"`
}

type ProductRow struct {
	ID              string
	CategoryID      string
	Name            string
	Price           int
	CurrentStock    int
	MinStockAlert   int
	ImageURL        *string
	Icon            *string
	TaxRate         *int
	Allergens       []string
	UpdatedAt       Time
	CategoryTaxRate *int
}

func (row ProductRow) ToProduct() Product {
	allergens := row.Allergens
	if allergens == nil {
		allergens = []string{}
	}

	return Product{
		ID:            row.ID,
		CategoryID:    row.CategoryID,
		Name:          row.Name,
		Price:         row.Price,
		CurrentStock:  row.CurrentStock,
		MinStockAlert: row.MinStockAlert,
		ImageURL:      row.ImageURL,
		Icon:          row.Icon,
		TaxRate:       ResolveTaxRate(row.TaxRate, row.CategoryTaxRate),
		OwnTaxRate:    row.TaxRate,
		Allergens:     allergens,
		LastUpdated:   row.UpdatedAt,
	}
}

type NewProduct struct {
	CategoryID    string
	Name          string
	Price         int
	CurrentStock  int
	MinStockAlert int
	ImageURL      *string
	Icon          *string
	Allergens     []string
	TaxRate       *int
}

type ProductChanges struct {
	Name            *string
	CategoryID      *string
	Price           *int
	CurrentStock    *int
	MinStockAlert   *int
	ImageURL        *string
	ClearImageURL   bool
	Icon            *string
	ClearIcon       bool
	Allergens       []string
	OwnTaxRate      *int
	ClearOwnTaxRate bool
}
