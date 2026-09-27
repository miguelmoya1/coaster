package domain

// Tax rates are in basis points: 1000 is 10 %. The same as tax-rates.ts in @coaster/common.
const (
	DefaultTaxRate = 1000
	MaxTaxRate     = 10000
)

// Allergens are the fourteen allergens a product can declare, as ALLERGENS in @coaster/common.
var Allergens = []string{
	"GLUTEN", "CRUSTACEANS", "EGGS", "FISH", "PEANUTS", "SOYBEANS", "MILK",
	"NUTS", "CELERY", "MUSTARD", "SESAME", "SULPHITES", "LUPIN", "MOLLUSCS",
}

// ResolveTaxRate is resolveTaxRate: the product's own rate, else its category's, else the default.
func ResolveTaxRate(productTaxRate, categoryTaxRate *int) int {
	if productTaxRate != nil {
		return *productTaxRate
	}
	if categoryTaxRate != nil {
		return *categoryTaxRate
	}
	return DefaultTaxRate
}

// Product is something an establishment sells. Its JSON is Product in @coaster/common.
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

// ProductRow is a product as it is stored. CategoryTaxRate is nil when the row was read
// without its category.
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

// ToProduct is ProductsMapper.toDomain.
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

// NewProduct is a product to create, with its defaults already applied.
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

// ProductChanges is an update of a product. A nil field stays as it is; the Clear fields
// empty a column that was sent as null.
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
