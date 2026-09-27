package service

import (
	"context"
	"reflect"
	"slices"
	"testing"

	"api-go/internal/core/domain"
)

// fakeUserRepo knows the users in ids and keeps the changes it was asked to write.
type fakeUserRepo struct {
	ids     []string
	updates []domain.UserProfileChanges
}

func (r *fakeUserRepo) Exists(_ context.Context, userID string) (bool, error) {
	return slices.Contains(r.ids, userID), nil
}

func (r *fakeUserRepo) UpdateProfile(_ context.Context, _ string, changes domain.UserProfileChanges) error {
	r.updates = append(r.updates, changes)
	return nil
}

func TestUserServiceUpdateProfile(t *testing.T) {
	name := "Ana María"
	english := "en"
	empty := ""

	tests := []struct {
		name    string
		userID  string
		changes domain.UserProfileChanges
		want    domain.UserProfileChanges
		wantErr bool
	}{
		{
			name:    "name and language",
			userID:  "u1",
			changes: domain.UserProfileChanges{Name: &name, Language: &english},
			want:    domain.UserProfileChanges{Name: &name, Language: &english},
		},
		{
			name:    "an empty language leaves the preferences alone",
			userID:  "u1",
			changes: domain.UserProfileChanges{ClearPhotoURL: true, Language: &empty},
			want:    domain.UserProfileChanges{ClearPhotoURL: true},
		},
		{
			name:    "a user that does not exist",
			userID:  "nobody",
			changes: domain.UserProfileChanges{Name: &name},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeUserRepo{ids: []string{"u1"}}
			events := &recordedEvents{}
			users := NewUserService(repo, events, newFakeCache())

			err := users.UpdateProfile(context.Background(), tt.userID, tt.changes)

			if tt.wantErr {
				if !domain.HasCode(err, domain.CodeUserNotFound) {
					t.Fatalf("err = %v, want USER_NOT_FOUND", err)
				}
				if len(repo.updates) != 0 || len(events.events) != 0 {
					t.Errorf("updates = %+v, events = %v", repo.updates, events.names())
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}

			if len(repo.updates) != 1 || !reflect.DeepEqual(repo.updates[0], tt.want) {
				t.Errorf("updates = %+v, want %+v", repo.updates, tt.want)
			}
			if len(events.events) != 1 || events.events[0] != (domain.UserUpdated{UserID: "u1"}) {
				t.Errorf("events = %+v", events.events)
			}
		})
	}
}

func TestUserServiceForgetCache(t *testing.T) {
	cache := newFakeCache()
	users := NewUserService(&fakeUserRepo{}, &recordedEvents{}, cache)
	ctx := context.Background()

	users.ForgetCache(ctx, domain.EstablishmentSettingsUpdated{EstablishmentID: "e1"})
	users.ForgetCache(ctx, domain.UserUpdated{UserID: "u1"})

	if !slices.Equal(cache.forgotten, []string{"user:u1:role", "user:u1"}) {
		t.Errorf("forgotten = %v", cache.forgotten)
	}
}
