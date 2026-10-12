package domain

type Role string

const (
	RoleUser  Role = "USER"
	RoleAdmin Role = "ADMIN"
)

const DefaultLanguage = "es"

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
