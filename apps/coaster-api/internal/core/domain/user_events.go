package domain

type UserUpdated struct {
	UserID string
}

func (UserUpdated) Name() string { return "UserUpdatedEvent" }
