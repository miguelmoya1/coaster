package domain

// Category groups products of an establishment. Its JSON is Category in @coaster/common.
type Category struct {
	ID              string  `json:"id"`
	EstablishmentID string  `json:"establishmentId"`
	Name            string  `json:"name"`
	Icon            *string `json:"icon,omitempty"`
	TaxRate         int     `json:"taxRate"`
}

// NewCategory is what creating a category needs. A nil TaxRate takes DefaultTaxRate.
type NewCategory struct {
	Name    string
	Icon    *string
	TaxRate *int
}

// CategoryChanges is an update of a category. Name is always set, a nil field stays as it
// is, and ClearIcon empties the icon (an icon sent as null).
type CategoryChanges struct {
	Name      string
	Icon      *string
	ClearIcon bool
	TaxRate   *int
}
