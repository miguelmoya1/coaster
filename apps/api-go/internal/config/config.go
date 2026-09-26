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
)

var developmentCORSOrigins = []string{"http://localhost:4200"}

// Config holds every environment variable the API reads. Nothing else calls os.Getenv.
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
	ProBasePriceCents      string
	ProIncludedSeats       string
	ProExtraSeatPriceCents string

	ResendAPIKey string
	EmailFrom    string

	MediaBucket string

	AIGatewayAPIKey        string
	AIMonthlyMessages      string
	AITrialMonthlyMessages string

	// Only for the e2e against Go: where to post emails and where to read Google's keys.
	TestMailboxURL string
	GoogleCertsURL string
}

// Load reads the environment. It fails without DATABASE_URL or AUTH_JWT_SECRET, as Nest does.
func Load() (Config, error) {
	isProduction := os.Getenv("NODE_ENV") == "production"

	cfg := Config{
		Port:         withDefault(os.Getenv("PORT"), defaultPort),
		IsProduction: isProduction,

		DatabaseURL: os.Getenv("DATABASE_URL"),
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
		ProBasePriceCents:      os.Getenv("PRO_BASE_PRICE_CENTS"),
		ProIncludedSeats:       os.Getenv("PRO_INCLUDED_SEATS"),
		ProExtraSeatPriceCents: os.Getenv("PRO_EXTRA_SEAT_PRICE_CENTS"),

		ResendAPIKey: os.Getenv("RESEND_API_KEY"),
		EmailFrom:    withDefault(os.Getenv("EMAIL_FROM"), defaultEmailFrom),

		MediaBucket: os.Getenv("MEDIA_BUCKET"),

		AIGatewayAPIKey:        os.Getenv("AI_GATEWAY_API_KEY"),
		AIMonthlyMessages:      os.Getenv("AI_MONTHLY_MESSAGES"),
		AITrialMonthlyMessages: os.Getenv("AI_TRIAL_MONTHLY_MESSAGES"),

		TestMailboxURL: os.Getenv("TEST_MAILBOX_URL"),
		GoogleCertsURL: os.Getenv("GOOGLE_CERTS_URL"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL environment variable is required")
	}

	if cfg.AuthJWTSecret == "" {
		return Config{}, errors.New("AUTH_JWT_SECRET environment variable is required")
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
