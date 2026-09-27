package domain

// TableStatus is TableStatus in @coaster/common. An open order keeps its table OCCUPIED.
type TableStatus string

const (
	TableFree     TableStatus = "FREE"
	TableOccupied TableStatus = "OCCUPIED"
)

// Table is a table of an establishment, as the API sends it (Table in @coaster/common).
type Table struct {
	ID              string      `json:"id"`
	EstablishmentID string      `json:"establishmentId"`
	Name            string      `json:"name"`
	Status          TableStatus `json:"status"`
	CreatedAt       Time        `json:"createdAt"`
	UpdatedAt       Time        `json:"updatedAt"`
}
