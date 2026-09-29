package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

const (
	defaultPort           = "3000"
	defaultEmailFrom      = "Coaster <hello@coaster.business>"
	defaultFrontendURL    = "http://localhost:4200"
	defaultPublicDir      = "public"
	defaultTrustProxyHops = 1

	defaultProBasePriceCents      = 1999
	defaultProIncludedSeats       = 10
	defaultProExtraSeatPriceCents = 200

	defaultAIMonthlyMessages      = 500
	defaultAITrialMonthlyMessages = 100
)

var developmentCORSOrigins = []string{"http://localhost:4200"}

type Config struct {
	Port         string
	IsProduction bool

	DatabaseURL string
	RedisURL    string

	AuthJWTSecret         string
	PrinterJWTSecret      string
	GoogleClientID        string
	BetaAllowlistEnabled  bool
	PwnedPasswordsEnabled bool

	FrontendURL string
	PublicURL   string
	PublicDir   string

	CORSOrigins    []string
	TrustProxyHops int

	StripeSecretKey        string
	StripeWebhookSecret    string
	StripePricePro         string
	StripePriceProLegacy   string
	ProBasePriceCents      int
	ProIncludedSeats       int
	ProExtraSeatPriceCents int

	ResendAPIKey string
	EmailFrom    string

	MediaBucket string

	AIGatewayAPIKey        string
	AIMonthlyMessages      int
	AITrialMonthlyMessages int

	TestMailboxURL string
	GoogleCertsURL string
}

func DatabaseURL() (string, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return "", errors.New("DATABASE_URL environment variable is required")
	}

	return databaseURL, nil
}

func Load() (Config, error) {
	databaseURL, err := DatabaseURL()
	if err != nil {
		return Config{}, err
	}

	isProduction := os.Getenv("NODE_ENV") == "production"

	cfg := Config{
		Port:         withDefault(os.Getenv("PORT"), defaultPort),
		IsProduction: isProduction,

		DatabaseURL: databaseURL,
		RedisURL:    os.Getenv("REDIS_URL"),

		AuthJWTSecret:         os.Getenv("AUTH_JWT_SECRET"),
		PrinterJWTSecret:      os.Getenv("PRINTER_JWT_SECRET"),
		GoogleClientID:        os.Getenv("GOOGLE_CLIENT_ID"),
		BetaAllowlistEnabled:  os.Getenv("BETA_ALLOWLIST_ENABLED") == "true",
		PwnedPasswordsEnabled: os.Getenv("PWNED_PASSWORDS_ENABLED") != "false",

		FrontendURL: strings.TrimRight(withDefault(os.Getenv("FRONTEND_URL"), defaultFrontendURL), "/"),
		PublicURL:   os.Getenv("PUBLIC_URL"),
		PublicDir:   withDefault(os.Getenv("PUBLIC_DIR"), defaultPublicDir),

		CORSOrigins:    corsOrigins(os.Getenv("CORS_ORIGINS"), isProduction),
		TrustProxyHops: trustProxyHops(os.LookupEnv("TRUST_PROXY_HOPS")),

		StripeSecretKey:        os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:    os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePricePro:         os.Getenv("STRIPE_PRICE_PRO"),
		StripePriceProLegacy:   os.Getenv("STRIPE_PRICE_PRO_LEGACY"),
		ProBasePriceCents:      positiveInt(os.Getenv("PRO_BASE_PRICE_CENTS"), defaultProBasePriceCents),
		ProIncludedSeats:       positiveInt(os.Getenv("PRO_INCLUDED_SEATS"), defaultProIncludedSeats),
		ProExtraSeatPriceCents: positiveInt(os.Getenv("PRO_EXTRA_SEAT_PRICE_CENTS"), defaultProExtraSeatPriceCents),

		ResendAPIKey: os.Getenv("RESEND_API_KEY"),
		EmailFrom:    withDefault(os.Getenv("EMAIL_FROM"), defaultEmailFrom),

		MediaBucket: os.Getenv("MEDIA_BUCKET"),

		AIGatewayAPIKey:        os.Getenv("AI_GATEWAY_API_KEY"),
		AIMonthlyMessages:      intOr(os.Getenv("AI_MONTHLY_MESSAGES"), defaultAIMonthlyMessages),
		AITrialMonthlyMessages: intOr(os.Getenv("AI_TRIAL_MONTHLY_MESSAGES"), defaultAITrialMonthlyMessages),

		TestMailboxURL: os.Getenv("TEST_MAILBOX_URL"),
		GoogleCertsURL: os.Getenv("GOOGLE_CERTS_URL"),
	}

	if cfg.AuthJWTSecret == "" {
		return Config{}, errors.New("AUTH_JWT_SECRET environment variable is required")
	}

	if cfg.PrinterJWTSecret == "" {
		return Config{}, errors.New("PRINTER_JWT_SECRET environment variable is required")
	}

	if isProduction && (cfg.TestMailboxURL != "" || cfg.GoogleCertsURL != "") {
		return Config{}, errors.New("TEST_MAILBOX_URL and GOOGLE_CERTS_URL are only for tests and cannot be set in production")
	}

	return cfg, nil
}

func withDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}

	return value
}

func intOr(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}

	return parsed
}

func positiveInt(value string, fallback int) int {
	parsed := intOr(value, fallback)
	if parsed <= 0 {
		return fallback
	}

	return parsed
}

func corsOrigins(value string, isProduction bool) []string {
	var origins []string

	for origin := range strings.SplitSeq(value, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins = append(origins, origin)
		}
	}

	if len(origins) > 0 {
		return origins
	}

	if isProduction {
		return nil
	}

	return developmentCORSOrigins
}

func trustProxyHops(value string, isSet bool) int {
	if !isSet {
		return defaultTrustProxyHops
	}

	hops, err := strconv.Atoi(value)
	if err != nil || hops < 0 {
		return 0
	}

	return hops
}
