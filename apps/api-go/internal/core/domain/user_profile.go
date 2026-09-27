package domain

// UserProfileChanges is what a user changes of their own profile (UpdateUserDto). A nil
// field stays as it is, ClearPhotoURL empties the photo (photoUrl sent as null) and
// Language, when set, goes into the user's preferences.
type UserProfileChanges struct {
	Name          *string
	PhotoURL      *string
	ClearPhotoURL bool
	Language      *string
}
