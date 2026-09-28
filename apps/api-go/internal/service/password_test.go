package service

import (
	"strings"
	"testing"
)

var nodeHashes = []struct {
	password string
	hash     string
}{
	{"a-good-enough-password", "$argon2id$v=19$m=19456,t=2,p=1$aon1/I99s6yPa8eZU0HjfA$dJkZd7WisfN7nPJg4Xc1fpJDL5joAyHYpkpbPYByzkE"},
	{"la-de-siempre", "$argon2id$v=19$m=19456,t=2,p=1$tSKN/EuPtQx1GU74MN6RVQ$1i9dG8QtQmzhEtcrogEmACVHI4EV5HW7tvGXSooEiao"},
	{"contraseña-con-eñe-y-€", "$argon2id$v=19$m=19456,t=2,p=1$9epdw4N9mDgbtxi/Sykwlw$UBqWl5NyJgbgAOjN+oEtduBbdaUv0gtVpXOqluMVPq0"},
	{"short", "$argon2id$v=19$m=19456,t=2,p=1$trfs/QF1vJifeGRXU19bgA$+vuqLJHyI0bcaPGYXGVUFQ1nfHjyltoIvUOp3mo9kdM"},
	{strings.Repeat("x", 128), "$argon2id$v=19$m=19456,t=2,p=1$wJ2Y9u0oOLf6j30UjU0giA$3UNY4NjjJ+D3v2clZ9pgQOiCdYoRBpOow3R8vujZ9Go"},
}

func TestVerifyPasswordReadsNodeHashes(t *testing.T) {
	for _, tt := range nodeHashes {
		t.Run(tt.password[:min(len(tt.password), 20)], func(t *testing.T) {
			if !VerifyPassword(tt.hash, tt.password) {
				t.Error("the right password was rejected")
			}
			if VerifyPassword(tt.hash, tt.password+"!") {
				t.Error("a different password was accepted")
			}
		})
	}
}

func TestHashPasswordWritesNodeFormat(t *testing.T) {
	hashed, err := HashPassword("a-good-enough-password")
	if err != nil {
		t.Fatal(err)
	}

	if !strings.HasPrefix(hashed, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Errorf("hash %q does not use Nest's parameters", hashed)
	}

	parts := strings.Split(hashed, "$")
	if len(parts[4]) != 22 || len(parts[5]) != 43 {
		t.Errorf("salt and hash are %d and %d characters, want 22 and 43", len(parts[4]), len(parts[5]))
	}

	if !VerifyPassword(hashed, "a-good-enough-password") {
		t.Error("the password it hashed was rejected")
	}
}

func TestHashPasswordSaltsEveryHash(t *testing.T) {
	first, _ := HashPassword("same")
	second, _ := HashPassword("same")

	if first == second {
		t.Error("the same password hashed twice to the same value")
	}
}

func TestVerifyPasswordRejectsWhatIsNotAHash(t *testing.T) {
	tests := []string{
		"",
		"not-a-hash",
		"$argon2id$v=19$m=19456,t=2,p=1$onlysalt",
		"$argon2id$v=16$m=19456,t=2,p=1$aon1/I99s6yPa8eZU0HjfA$dJkZd7WisfN7nPJg4Xc1fpJDL5joAyHYpkpbPYByzkE",
		"$argon2d$v=19$m=19456,t=2,p=1$aon1/I99s6yPa8eZU0HjfA$dJkZd7WisfN7nPJg4Xc1fpJDL5joAyHYpkpbPYByzkE",
		"$argon2id$v=19$m=0,t=2,p=1$aon1/I99s6yPa8eZU0HjfA$dJkZd7WisfN7nPJg4Xc1fpJDL5joAyHYpkpbPYByzkE",
		"$argon2id$v=19$m=19456,t=2,p=1$***$dJkZd7WisfN7nPJg4Xc1fpJDL5joAyHYpkpbPYByzkE",
	}

	for _, hashed := range tests {
		if VerifyPassword(hashed, "a-good-enough-password") {
			t.Errorf("VerifyPassword(%q) = true", hashed)
		}
	}
}

func TestBurnVerificationTimeAnswersFalse(t *testing.T) {
	if burnVerificationTime() {
		t.Error("burnVerificationTime() = true")
	}
}
