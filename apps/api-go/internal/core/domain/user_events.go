package domain

// UserUpdated is UserUpdatedEvent: a user's profile, role or activation changed. Its
// subscriber forgets the cached user (userCacheKey and userRoleCacheKey).
type UserUpdated struct {
	UserID string
}

func (UserUpdated) Name() string { return "UserUpdatedEvent" }
