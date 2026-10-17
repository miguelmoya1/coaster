package domain

import (
	"testing"
	"time"
)

func TestAuthUser(t *testing.T) {
	verified := time.Now()
	lang := "en"
	user := AuthUser{
		ID:              "u1",
		Email:           "ana@example.com",
		Name:            "Ana",
		Active:          true,
		Role:            RoleUser,
		Language:        &lang,
		EmailVerifiedAt: &verified,
	}

	converted := user.ToUser()
	if converted.ID != "u1" || converted.Language != "en" || !converted.EmailVerified {
		t.Errorf("ToUser() = %+v", converted)
	}
	if user.MailLanguage() != "en" {
		t.Errorf("MailLanguage() = %q, want en", user.MailLanguage())
	}

	// Without language and not verified
	user2 := AuthUser{
		ID:     "u2",
		Email:  "luis@example.com",
		Name:   "Luis",
		Active: true,
		Role:   RoleUser,
	}
	converted2 := user2.ToUser()
	if converted2.Language != DefaultLanguage || converted2.EmailVerified {
		t.Errorf("ToUser() default = %+v", converted2)
	}
	if user2.MailLanguage() != "" {
		t.Errorf("MailLanguage() = %q, want empty", user2.MailLanguage())
	}
}
