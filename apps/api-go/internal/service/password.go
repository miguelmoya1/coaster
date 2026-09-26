package service

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// The argon2id parameters of @node-rs/argon2 in Nest, which are OWASP's: 19 MiB, two passes,
// one lane, a 16-byte salt and a 32-byte hash.
const (
	argonMemoryKiB  = 19456
	argonIterations = 2
	argonThreads    = 1
	argonSaltBytes  = 16
	argonKeyBytes   = 32
)

var errNotAnArgonHash = errors.New("not an argon2 hash")

// dummyPasswordHash is checked when there is no user, so a login takes as long whether the
// address has an account or not.
var dummyPasswordHash = mustHashPassword("coaster-has-no-user-here")

// HashPassword returns the PHC string @node-rs/argon2 writes:
// $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>, in base64 without padding.
func HashPassword(plain string) (string, error) {
	salt := make([]byte, argonSaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key := argon2.IDKey([]byte(plain), salt, argonIterations, argonMemoryKiB, argonThreads, argonKeyBytes)

	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemoryKiB, argonIterations, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// VerifyPassword reports whether plain matches hashed. A hash it cannot read is a mismatch.
func VerifyPassword(hashed, plain string) bool {
	parsed, err := parseArgonHash(hashed)
	if err != nil {
		return false
	}

	var key []byte
	switch parsed.variant {
	case "argon2id":
		key = argon2.IDKey([]byte(plain), parsed.salt, parsed.iterations, parsed.memory, parsed.threads, uint32(len(parsed.key)))
	case "argon2i":
		key = argon2.Key([]byte(plain), parsed.salt, parsed.iterations, parsed.memory, parsed.threads, uint32(len(parsed.key)))
	default:
		return false
	}

	return subtle.ConstantTimeCompare(key, parsed.key) == 1
}

// burnVerificationTime spends the time of a real check and answers false.
func burnVerificationTime() bool {
	VerifyPassword(dummyPasswordHash, "coaster-has-no-user-here-either")
	return false
}

type argonHash struct {
	variant    string
	memory     uint32
	iterations uint32
	threads    uint8
	salt       []byte
	key        []byte
}

// parseArgonHash reads "$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>".
func parseArgonHash(hashed string) (argonHash, error) {
	parts := strings.Split(hashed, "$")
	if len(parts) != 6 || parts[0] != "" {
		return argonHash{}, errNotAnArgonHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return argonHash{}, errNotAnArgonHash
	}

	parsed := argonHash{variant: parts[1]}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &parsed.memory, &parsed.iterations, &parsed.threads); err != nil {
		return argonHash{}, errNotAnArgonHash
	}
	if parsed.memory == 0 || parsed.iterations == 0 || parsed.threads == 0 {
		return argonHash{}, errNotAnArgonHash
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return argonHash{}, errNotAnArgonHash
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(key) == 0 {
		return argonHash{}, errNotAnArgonHash
	}

	parsed.salt = salt
	parsed.key = key

	return parsed, nil
}

func mustHashPassword(plain string) string {
	hashed, err := HashPassword(plain)
	if err != nil {
		panic(err)
	}
	return hashed
}
