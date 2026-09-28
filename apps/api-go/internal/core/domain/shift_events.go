package domain

type ShiftCreated struct {
	EstablishmentID string
	Shift           Shift
}

func (ShiftCreated) Name() string { return "ShiftCreatedEvent" }

type ShiftDeleted struct {
	EstablishmentID string
	ShiftID         string
}

func (ShiftDeleted) Name() string { return "ShiftDeletedEvent" }
