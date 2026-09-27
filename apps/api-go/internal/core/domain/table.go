package domain

// TableStatus is TableStatus in @coaster/common. An open order keeps its table OCCUPIED.
type TableStatus string

const (
	TableFree     TableStatus = "FREE"
	TableOccupied TableStatus = "OCCUPIED"
)
