package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

type JWTHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type JWTPayload struct {
	BarID string `json:"barId"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

func JWT(secret, barID string) func(http.Handler) http.Handler {
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

			if barID != "" && subtle.ConstantTimeCompare([]byte(payload.BarID), []byte(barID)) != 1 {
				log.Printf("Rejected a token issued for bar %q on the bridge for bar %q\n", payload.BarID, barID)
				deny(w, http.StatusForbidden, "Token was issued for a different bar")
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
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format: must have 3 parts")
	}

	headerPart, payloadPart, signaturePart := parts[0], parts[1], parts[2]

	headerBytes, err := base64.RawURLEncoding.DecodeString(headerPart)
	if err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}
	var header JWTHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse header JSON: %w", err)
	}
	if header.Alg != "HS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(headerPart + "." + payloadPart))
	expectedSignature := mac.Sum(nil)

	sigBytes, err := base64.RawURLEncoding.DecodeString(signaturePart)
	if err != nil {
		return nil, fmt.Errorf("failed to decode signature: %w", err)
	}
	if !hmac.Equal(sigBytes, expectedSignature) {
		return nil, errors.New("signature verification failed")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadPart)
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}
	var payload JWTPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse payload JSON: %w", err)
	}

	if payload.Exp == 0 {
		return nil, errors.New("missing exp claim")
	}
	if time.Unix(payload.Exp, 0).Before(time.Now()) {
		return nil, errors.New("token is expired")
	}

	return &payload, nil
}
