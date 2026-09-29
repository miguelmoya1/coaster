package domain

type Category struct {
	ID              string  `json:"id"`
	EstablishmentID string  `json:"establishmentId"`
	Name            string  `json:"name"`
	Icon            *string `json:"icon,omitempty"`
	TaxRate         int     `json:"taxRate"`
}

type NewCategory struct {
	Name    string
	Icon    *string
	TaxRate *int
}

type CategoryChanges struct {
	Name      string
	Icon      *string
	ClearIcon bool
	TaxRate   *int
}
