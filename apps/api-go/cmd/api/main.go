package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api-go/internal/adapter/cache"
	"api-go/internal/adapter/email"
	"api-go/internal/adapter/event"
	"api-go/internal/adapter/google"
	httphandler "api-go/internal/adapter/handler/http"
	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/adapter/payment"
	"api-go/internal/adapter/pwned"
	"api-go/internal/adapter/repository"
	"api-go/internal/config"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
	"api-go/internal/service"
)

// Cloud Run waits 10 seconds after SIGTERM before killing the container.
const shutdownTimeout = 8 * time.Second

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{ReplaceAttr: cloudLoggingNames})))

	if err := run(); err != nil {
		slog.Error("the API stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	if len(cfg.CORSOrigins) == 0 {
		slog.Error("CORS_ORIGINS is not set: every cross-origin request will be refused")
	}

	pool, err := repository.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	bus := event.NewBus()
	defer bus.Wait()

	realtimeBus := cache.NewRealtimeBus(cfg.RedisURL)
	defer realtimeBus.Close()
	realtimeService := service.NewRealtimeService(realtimeBus)
	go realtimeBus.Listen(ctx, realtimeService)
	var realtime ports.Realtime = realtimeService

	redisClient := cache.NewClient(cfg.RedisURL)
	if redisClient != nil {
		defer redisClient.Close()
	}
	valueCache := cache.NewCache(redisClient)

	authUsers := repository.NewAuthUserRepository(pool)
	authSessions := repository.NewAuthSessionRepository(pool)
	authTokens := repository.NewAuthTokenRepository(pool)
	authIdentities := repository.NewAuthIdentityRepository(pool)

	googleVerifier, err := google.NewVerifier(ctx, cfg.GoogleClientID, cfg.GoogleCertsURL)
	if err != nil {
		return err
	}

	var mailer ports.Mailer = email.NewLogMailer(cfg.FrontendURL, cfg.IsProduction)
	if cfg.ResendAPIKey != "" {
		mailer = email.NewResendMailer(cfg.ResendAPIKey, cfg.EmailFrom, cfg.FrontendURL)
	}
	if cfg.TestMailboxURL != "" {
		mailer = email.NewTestMailbox(cfg.TestMailboxURL)
	}

	pwnedPasswords := pwned.NewPasswords(cfg.PwnedPasswordsEnabled)

	accessTokens := service.NewAccessTokenService(cfg.AuthJWTSecret, authUsers, valueCache)
	subscriptions := service.NewSubscriptionService(service.SubscriptionDependencies{
		Repo:     repository.NewEstablishmentSubscriptionRepository(pool),
		Payments: payment.NewStripeGateway(cfg.StripeSecretKey, cfg.StripeWebhookSecret),
		Cache:    valueCache,
		Events:   bus,
		Realtime: realtime,
		Billing: service.BillingConfig{
			PricePro:            cfg.StripePricePro,
			PriceProLegacy:      cfg.StripePriceProLegacy,
			BasePriceCents:      cfg.ProBasePriceCents,
			IncludedSeats:       cfg.ProIncludedSeats,
			ExtraSeatPriceCents: cfg.ProExtraSeatPriceCents,
			FrontendURL:         cfg.FrontendURL,
		},
	})
	for _, name := range domain.SubscriptionEventNames {
		bus.Subscribe(name, subscriptions.ForgetCache)
		bus.Subscribe(name, subscriptions.PublishRealtime)
	}
	bus.Subscribe(domain.DuplicateSubscriptionDetectedEventName, subscriptions.ReportDuplicate)

	security := service.NewSecurityService(repository.NewSecurityRepository(pool), valueCache, subscriptions)
	authEvents := service.NewAuthEventService(repository.NewAuthEventRepository(pool))
	bus.Subscribe(domain.AuthEventName, authEvents.Record)

	authService := service.NewAuthService(service.AuthDependencies{
		Users:           authUsers,
		Identities:      authIdentities,
		Tokens:          authTokens,
		SessionRepo:     authSessions,
		Sessions:        service.NewSessionService(authSessions, accessTokens, bus),
		Google:          googleVerifier,
		Pwned:           pwnedPasswords,
		Attempts:        cache.NewLoginAttempts(redisClient),
		Mailer:          mailer,
		Events:          bus,
		Cache:           valueCache,
		BetaAllowlistOn: cfg.BetaAllowlistEnabled,
	})
	accountService := service.NewAccountService(service.AccountDependencies{
		Users:      authUsers,
		Identities: authIdentities,
		Tokens:     authTokens,
		Sessions:   authSessions,
		Pwned:      pwnedPasswords,
		Mailer:     mailer,
		Events:     bus,
		Cache:      valueCache,
	})

	handlers := httphandler.Handlers{
		Guard:    middleware.NewGuard(accessTokens, security, cache.NewRateLimiter(redisClient), cfg.TrustProxyHops),
		Auth:     httphandler.NewAuthHandler(authService, cfg.IsProduction),
		Account:  httphandler.NewAccountHandler(accountService),
		Realtime: httphandler.NewRealtimeHandler(realtimeService),

		EstablishmentSubscription: httphandler.NewEstablishmentSubscriptionHandler(subscriptions),
		StripeWebhook:             httphandler.NewStripeWebhookHandler(subscriptions),
	}

	router, err := httphandler.NewRouter(
		httphandler.RouterConfig{CORSOrigins: cfg.CORSOrigins, PublicDir: cfg.PublicDir},
		handlers,
	)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:              net.JoinHostPort("0.0.0.0", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}
	server.RegisterOnShutdown(realtimeService.CloseAll)

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("the API is listening", "port", cfg.Port)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
	}

	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	return server.Shutdown(shutdownCtx)
}

// cloudLoggingNames renames slog's "level" and "msg" to the names Cloud Logging reads.
func cloudLoggingNames(groups []string, attr slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return attr
	}

	switch attr.Key {
	case slog.LevelKey:
		attr.Key = "severity"
	case slog.MessageKey:
		attr.Key = "message"
	}

	return attr
}
