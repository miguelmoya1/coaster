package domain

type ShiftCreatedEvent struct {
	EstablishmentID string
	Shift           Shift
}

type ShiftDeletedEvent struct {
	EstablishmentID string
	ShiftID         string
}
