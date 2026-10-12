package domain

type TableStatus string

const (
	TableFree     TableStatus = "FREE"
	TableOccupied TableStatus = "OCCUPIED"
)

type Table struct {
	ID              string      `json:"id"`
	EstablishmentID string      `json:"establishmentId"`
	Name            string      `json:"name"`
	Status          TableStatus `json:"status"`
	CreatedAt       Time        `json:"createdAt"`
	UpdatedAt       Time        `json:"updatedAt"`
}
