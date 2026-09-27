package domain

// ShiftCreated is published after a shift is saved (ShiftCreatedEvent in Nest).
type ShiftCreated struct {
	EstablishmentID string
	Shift           Shift
}

func (ShiftCreated) Name() string { return "ShiftCreatedEvent" }

// ShiftDeleted is published after a shift is deleted (ShiftDeletedEvent in Nest).
type ShiftDeleted struct {
	EstablishmentID string
	ShiftID         string
}

func (ShiftDeleted) Name() string { return "ShiftDeletedEvent" }
