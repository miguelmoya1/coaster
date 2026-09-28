package google

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"google.golang.org/api/idtoken"
	"google.golang.org/api/option"

	"api-go/internal/core/domain"
)

var issuers = []string{"accounts.google.com", "https://accounts.google.com"}

type Verifier struct {
	clientID  string
	validator *idtoken.Validator
	now       func() time.Time
}

func NewVerifier(ctx context.Context, clientID, certsURL string) (*Verifier, error) {
	verifier := &Verifier{clientID: clientID, now: time.Now}
	if clientID == "" {
		return verifier, nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	if certsURL != "" {
		target, err := url.Parse(certsURL)
		if err != nil {
			return nil, err
		}
		client.Transport = redirectTo{target: target, next: http.DefaultTransport}
	}

	validator, err := idtoken.NewValidator(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, err
	}
	verifier.validator = validator

	return verifier, nil
}

func (v *Verifier) Configured() bool {
	return v.clientID != ""
}

func (v *Verifier) Verify(ctx context.Context, credential string) *domain.GoogleIdentity {
	if v.validator == nil || credential == "" || algorithmOf(credential) != "RS256" {
		return nil
	}

	payload, err := v.validator.Validate(ctx, credential, v.clientID)
	if err != nil {
		slog.Debug("google token refused", "error", err)
		return nil
	}

	if !slices.Contains(issuers, payload.Issuer) || notYetValid(payload.Claims, v.now()) {
		return nil
	}

	email, _ := payload.Claims["email"].(string)
	verified := payload.Claims["email_verified"] == true || payload.Claims["email_verified"] == "true"
	if payload.Subject == "" || email == "" || !verified {
		return nil
	}

	identity := &domain.GoogleIdentity{Subject: payload.Subject, Email: strings.ToLower(email)}
	if name, ok := payload.Claims["name"].(string); ok {
		identity.Name = name
	}
	if picture, ok := payload.Claims["picture"].(string); ok {
		identity.Picture = &picture
	}

	return identity
}

func algorithmOf(token string) string {
	header, _, found := strings.Cut(token, ".")
	if !found {
		return ""
	}

	raw, err := base64.RawURLEncoding.DecodeString(header)
	if err != nil {
		return ""
	}

	var parsed struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return ""
	}

	return parsed.Alg
}

func notYetValid(claims map[string]any, now time.Time) bool {
	nbf, ok := claims["nbf"].(float64)
	return ok && int64(nbf) > now.Unix()
}

type redirectTo struct {
	target *url.URL
	next   http.RoundTripper
}

func (r redirectTo) RoundTrip(request *http.Request) (*http.Response, error) {
	redirected := request.Clone(request.Context())
	redirected.URL = r.target
	redirected.Host = r.target.Host

	return r.next.RoundTrip(redirected)
}
