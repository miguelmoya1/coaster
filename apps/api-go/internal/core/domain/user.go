package domain

// Role is the platform role of a user (Role in the Prisma schema).
type Role string

const (
	RoleUser  Role = "USER"
	RoleAdmin Role = "ADMIN"
)

// DefaultLanguage is the language of a user without preferences.
const DefaultLanguage = "es"

// User is a person as the API sends it (User in @coaster/common). It never carries the
// password hash.
type User struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	PhotoURL      *string `json:"photoUrl,omitempty"`
	Active        bool    `json:"active"`
	Role          Role    `json:"role"`
	Language      string  `json:"language"`
	EmailVerified bool    `json:"emailVerified"`
}
