package domain

type UserProfileChanges struct {
	Name          *string
	PhotoURL      *string
	ClearPhotoURL bool
	Language      *string
}
