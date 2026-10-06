package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"coaster-api/internal/adapter/ai"
	"coaster-api/internal/adapter/cache"
	"coaster-api/internal/adapter/email"
	"coaster-api/internal/adapter/event"
	"coaster-api/internal/adapter/google"
	"coaster-api/internal/adapter/handler/httpapi"
	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/payment"
	"coaster-api/internal/adapter/pwned"
	"coaster-api/internal/adapter/repository"
	"coaster-api/internal/config"
	"coaster-api/internal/core/ports"
	"coaster-api/internal/service"
)

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

	realtimeBus := cache.NewRealtimeBus(cfg.RedisURL)
	defer realtimeBus.Close()
	realtimeService := service.NewRealtimeService(realtimeBus)
	go realtimeBus.Listen(ctx, realtimeService)

	redisClient := cache.NewClient(cfg.RedisURL)
	if redisClient != nil {
		defer redisClient.Close()
	}
	valueCache := cache.NewCache(redisClient)

	bus := event.NewBus()
	defer bus.Wait()

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

	authUsers := repository.NewAuthUserRepository(pool)
	authSessions := repository.NewAuthSessionRepository(pool)
	authTokens := repository.NewAuthTokenRepository(pool)
	authIdentities := repository.NewAuthIdentityRepository(pool)
	adminAudit := repository.NewAdminAuditRepository(pool)
	shiftRepository := repository.NewShiftRepository(pool)
	tableRepository := repository.NewTableRepository(pool)

	subscriptionService := service.NewSubscriptionService(service.SubscriptionDependencies{
		Repo:     repository.NewEstablishmentSubscriptionRepository(pool),
		Payments: payment.NewStripeGateway(cfg.StripeSecretKey, cfg.StripeWebhookSecret),
		Cache:    valueCache,
		Events:   bus,
		Realtime: realtimeService,
		Billing: service.BillingConfig{
			PricePro:            cfg.StripePricePro,
			PriceProLegacy:      cfg.StripePriceProLegacy,
			BasePriceCents:      cfg.ProBasePriceCents,
			IncludedSeats:       cfg.ProIncludedSeats,
			ExtraSeatPriceCents: cfg.ProExtraSeatPriceCents,
			FrontendURL:         cfg.FrontendURL,
		},
	})
	securityService := service.NewSecurityService(repository.NewSecurityRepository(pool), valueCache, subscriptionService)
	accessTokens := service.NewAccessTokenService(cfg.AuthJWTSecret, authUsers, valueCache)

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
	authEventService := service.NewAuthEventService(repository.NewAuthEventRepository(pool))

	establishmentService := service.NewEstablishmentService(repository.NewEstablishmentRepository(pool), bus, valueCache)
	userService := service.NewUserService(repository.NewUserRepository(pool), bus, valueCache)
	establishmentMemberService := service.NewEstablishmentMemberService(service.EstablishmentMemberDependencies{
		Members:  repository.NewEstablishmentMemberRepository(pool),
		Security: securityService,
		Tokens:   authTokens,
		Mailer:   mailer,
		Cache:    valueCache,
		Events:   bus,
		Realtime: realtimeService,
	})

	categoryService := service.NewCategoryService(repository.NewCategoryRepository(pool), bus)
	productService := service.NewProductService(repository.NewProductRepository(pool), bus)
	catalogueService := service.NewCatalogueService(repository.NewCatalogueRepository(pool), bus)
	menuService := service.NewMenuService(repository.NewMenuRepository(pool))
	catalogRealtime := service.NewCatalogRealtime(realtimeService)

	shiftService := service.NewShiftService(shiftRepository, securityService, bus, realtimeService)
	shiftExchangeService := service.NewShiftExchangeService(shiftRepository, repository.NewShiftExchangeRepository(pool), securityService)
	timeEntryService := service.NewTimeEntryService(repository.NewTimeEntryRepository(pool), shiftService, bus)

	tableService := service.NewTableService(tableRepository, bus)
	orderService := service.NewOrderService(repository.NewOrderRepository(pool), tableRepository, bus)
	orderStock := service.NewOrderStock(productService)
	orderRealtime := service.NewOrderRealtime(realtimeService)
	cashCloseService := service.NewCashCloseService(repository.NewCashCloseRepository(pool))
	statsService := service.NewStatsService(repository.NewStatsRepository(pool))

	printerService := service.NewPrinterService(
		repository.NewPrinterConfigRepository(pool),
		repository.NewPrinterPairingRepository(pool),
		repository.NewPrintJobRepository(pool),
		cfg.PrinterJWTSecret,
	)
	printerReleases := service.NewPrinterReleaseService(os.DirFS(filepath.Join(cfg.PublicDir, "downloads")), cfg.PublicURL)

	adminAuditService := service.NewAdminAuditService(adminAudit)
	adminMetricsService := service.NewAdminMetricsService(repository.NewAdminMetricsRepository(pool))
	adminUserService := service.NewAdminUserService(repository.NewAdminUserRepository(pool), adminAudit, bus)
	betaTesterService := service.NewBetaTesterService(repository.NewBetaTesterRepository(pool), bus, cfg.BetaAllowlistEnabled)
	adminEstablishmentService := service.NewAdminEstablishmentService(repository.NewAdminEstablishmentRepository(pool), adminAudit, bus, valueCache)

	aiService := service.NewAIService(service.AIDependencies{
		Model:    ai.NewGateway(cfg.AIGatewayAPIKey),
		Usage:    repository.NewAIUsageRepository(pool),
		Security: securityService,
		Config:   service.AIConfig{MonthlyMessages: cfg.AIMonthlyMessages, TrialMonthlyMessages: cfg.AITrialMonthlyMessages},

		Categories: categoryService,
		Products:   productService,
		Orders:     orderService,
		Tables:     tableService,
		Stats:      statsService,
		Shifts:     shiftService,
		Exchanges:  shiftExchangeService,
		Members:    establishmentMemberService,
	})

	for _, subscriber := range []ports.EventSubscriber{
		subscriptionService, authEventService, establishmentService, userService, establishmentMemberService,
		catalogRealtime, shiftService, timeEntryService, orderStock, orderRealtime, adminAuditService,
	} {
		bus.Subscribe(subscriber.EventHandlers()...)
	}

	router, err := httpapi.NewRouter(
		httpapi.RouterConfig{CORSOrigins: cfg.CORSOrigins, PublicDir: cfg.PublicDir},
		middleware.NewGuard(accessTokens, securityService, cache.NewRateLimiter(redisClient), cfg.TrustProxyHops),
		httpapi.NewAuthHandler(authService, cfg.IsProduction),
		httpapi.NewAccountHandler(accountService),
		httpapi.NewRealtimeHandler(realtimeService),
		httpapi.NewEstablishmentSubscriptionHandler(subscriptionService),
		httpapi.NewStripeWebhookHandler(subscriptionService),
		httpapi.NewEstablishmentHandler(establishmentService),
		httpapi.NewUserHandler(userService),
		httpapi.NewEstablishmentMemberHandler(establishmentMemberService),
		httpapi.NewCategoryHandler(categoryService),
		httpapi.NewProductHandler(productService),
		httpapi.NewCatalogueHandler(catalogueService),
		httpapi.NewMenuHandler(menuService),
		httpapi.NewShiftHandler(shiftService),
		httpapi.NewShiftExchangeHandler(shiftExchangeService),
		httpapi.NewTimeEntryHandler(timeEntryService),
		httpapi.NewTableHandler(tableService),
		httpapi.NewOrderHandler(orderService),
		httpapi.NewCashCloseHandler(cashCloseService),
		httpapi.NewStatsHandler(statsService),
		httpapi.NewPrinterHandler(printerService, printerReleases),
		httpapi.NewPrinterConnectionHandler(printerService),
		httpapi.NewAdminOverviewHandler(adminMetricsService, adminAuditService),
		httpapi.NewAdminUserHandler(adminUserService),
		httpapi.NewAdminBetaTesterHandler(betaTesterService),
		httpapi.NewAdminEstablishmentHandler(adminEstablishmentService),
		httpapi.NewAIHandler(aiService),
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
	server.RegisterOnShutdown(printerService.StopWaiting)

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
