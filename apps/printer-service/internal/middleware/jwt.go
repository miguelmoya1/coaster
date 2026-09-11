package middleware

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type JWTPayload struct {
	EstablishmentID string `json:"establishmentId"`
	jwt.RegisteredClaims
}

func JWT(secret, establishmentID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			token, err := bearerToken(r.Header.Get("Authorization"))
			if err != nil {
				deny(w, http.StatusUnauthorized, err.Error())
				return
			}

			payload, err := ValidateJWT(token, []byte(secret))
			if err != nil {
				log.Printf("JWT validation failed: %v\n", err)
				deny(w, http.StatusUnauthorized, "Unauthorized: "+err.Error())
				return
			}

			if establishmentID != "" && subtle.ConstantTimeCompare([]byte(payload.EstablishmentID), []byte(establishmentID)) != 1 {
				log.Printf("Rejected a token issued for establishment %q on the bridge for establishment %q\n", payload.EstablishmentID, establishmentID)
				deny(w, http.StatusForbidden, "Token was issued for a different establishment")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(header string) (string, error) {
	if header == "" {
		return "", errors.New("Authorization header required")
	}

	scheme, token, found := strings.Cut(header, " ")
	if !found || !strings.EqualFold(scheme, "bearer") || token == "" {
		return "", errors.New("Invalid Authorization header format")
	}

	return token, nil
}

func deny(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func ValidateJWT(tokenStr string, secret []byte) (*JWTPayload, error) {
	payload := &JWTPayload{}

	_, err := jwt.ParseWithClaims(
		tokenStr,
		payload,
		func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}

	return payload, nil
}
