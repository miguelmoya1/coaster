package repository

import (
	"context"
	"testing"

	"api-go/internal/core/domain"
)

// userProfile reads what UpdateProfile writes. language is nil without a preferences row.
func userProfile(t *testing.T, userID string) (name string, photoURL, language *string) {
	t.Helper()

	err := testPool.QueryRow(context.Background(), `
		SELECT u.name, u."photoUrl", p.language
		FROM "User" u
		LEFT JOIN "UserPreferences" p ON p."userId" = u.id
		WHERE u.id = $1`, userID).Scan(&name, &photoURL, &language)
	if err != nil {
		t.Fatal(err)
	}
	return name, photoURL, language
}

func TestUserRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewUserRepository(testPool)

	_, err := testPool.Exec(ctx, `INSERT INTO "User" (id, email, name, "photoUrl", "updatedAt") VALUES ('u1', 'ana@example.com', 'Ana', 'https://photo.example/ana.jpg', now())`)
	if err != nil {
		t.Fatal(err)
	}

	if exists, err := users.Exists(ctx, "u1"); err != nil || !exists {
		t.Errorf("Exists(u1) = %v, %v", exists, err)
	}
	if exists, err := users.Exists(ctx, "nobody"); err != nil || exists {
		t.Errorf("Exists(nobody) = %v, %v", exists, err)
	}

	newName := "Ana María"
	if err := users.UpdateProfile(ctx, "u1", domain.UserProfileChanges{Name: &newName}); err != nil {
		t.Fatal(err)
	}
	name, photoURL, language := userProfile(t, "u1")
	if name != "Ana María" || photoURL == nil || *photoURL != "https://photo.example/ana.jpg" || language != nil {
		t.Errorf("after the name: %s %v %v", name, photoURL, language)
	}

	english := "en"
	if err := users.UpdateProfile(ctx, "u1", domain.UserProfileChanges{ClearPhotoURL: true, Language: &english}); err != nil {
		t.Fatal(err)
	}
	name, photoURL, language = userProfile(t, "u1")
	if name != "Ana María" || photoURL != nil || language == nil || *language != "en" {
		t.Errorf("after the photo and the language: %s %v %v", name, photoURL, language)
	}

	spanish := "es"
	photo := "https://photo.example/new.jpg"
	if err := users.UpdateProfile(ctx, "u1", domain.UserProfileChanges{PhotoURL: &photo, Language: &spanish}); err != nil {
		t.Fatal(err)
	}
	_, photoURL, language = userProfile(t, "u1")
	if photoURL == nil || *photoURL != photo || language == nil || *language != "es" {
		t.Errorf("after a second language: %v %v", photoURL, language)
	}

	var preferences int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM "UserPreferences" WHERE "userId" = 'u1'`).Scan(&preferences); err != nil || preferences != 1 {
		t.Errorf("preferences rows = %d, %v", preferences, err)
	}
}
