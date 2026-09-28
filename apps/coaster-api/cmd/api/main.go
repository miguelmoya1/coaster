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
	httphandler "coaster-api/internal/adapter/handler/http"
	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/payment"
	"coaster-api/internal/adapter/pwned"
	"coaster-api/internal/adapter/repository"
	"coaster-api/internal/adapter/storage"
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

	security := service.NewSecurityService(repository.NewSecurityRepository(pool), valueCache, subscriptions)
	authEvents := service.NewAuthEventService(repository.NewAuthEventRepository(pool))

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

	catalogRealtime := service.NewCatalogRealtime(realtime)

	mediaStorage := storage.NewGCS(cfg.MediaBucket)
	defer mediaStorage.Close()

	categoryService := service.NewCategoryService(repository.NewCategoryRepository(pool), bus)
	productService := service.NewProductService(repository.NewProductRepository(pool), bus)
	catalogueService := service.NewCatalogueService(repository.NewCatalogueRepository(pool), bus)
	menuService := service.NewMenuService(repository.NewMenuRepository(pool))
	mediaService := service.NewMediaService(mediaStorage)

	handlers := httphandler.Handlers{
		Guard:    middleware.NewGuard(accessTokens, security, cache.NewRateLimiter(redisClient), cfg.TrustProxyHops),
		Auth:     httphandler.NewAuthHandler(authService, cfg.IsProduction),
		Account:  httphandler.NewAccountHandler(accountService),
		Realtime: httphandler.NewRealtimeHandler(realtimeService),

		EstablishmentSubscription: httphandler.NewEstablishmentSubscriptionHandler(subscriptions),
		StripeWebhook:             httphandler.NewStripeWebhookHandler(subscriptions),

		Category:  httphandler.NewCategoryHandler(categoryService),
		Product:   httphandler.NewProductHandler(productService),
		Catalogue: httphandler.NewCatalogueHandler(catalogueService),
		Menu:      httphandler.NewMenuHandler(menuService),
		Media:     httphandler.NewMediaHandler(mediaService),
	}

	shiftRepository := repository.NewShiftRepository(pool)
	shiftService := service.NewShiftService(shiftRepository, security, bus, realtime)
	shiftExchangeService := service.NewShiftExchangeService(shiftRepository, repository.NewShiftExchangeRepository(pool), security)
	timeEntryService := service.NewTimeEntryService(repository.NewTimeEntryRepository(pool), shiftService, bus)
	handlers.Shift = httphandler.NewShiftHandler(shiftService)
	handlers.ShiftExchange = httphandler.NewShiftExchangeHandler(shiftExchangeService)
	handlers.TimeEntry = httphandler.NewTimeEntryHandler(timeEntryService)

	establishmentService := service.NewEstablishmentService(repository.NewEstablishmentRepository(pool), bus, valueCache)
	userService := service.NewUserService(repository.NewUserRepository(pool), bus, valueCache)
	handlers.Establishment = httphandler.NewEstablishmentHandler(establishmentService)
	handlers.User = httphandler.NewUserHandler(userService)

	establishmentMemberService := service.NewEstablishmentMemberService(service.EstablishmentMemberDependencies{
		Members:  repository.NewEstablishmentMemberRepository(pool),
		Security: security,
		Tokens:   authTokens,
		Mailer:   mailer,
		Cache:    valueCache,
		Events:   bus,
		Realtime: realtime,
	})
	handlers.EstablishmentMember = httphandler.NewEstablishmentMemberHandler(establishmentMemberService)

	statsService := service.NewStatsService(repository.NewStatsRepository(pool))
	handlers.CashClose = httphandler.NewCashCloseHandler(service.NewCashCloseService(repository.NewCashCloseRepository(pool)))
	handlers.Stats = httphandler.NewStatsHandler(statsService)

	printerService := service.NewPrinterService(
		repository.NewPrinterConfigRepository(pool),
		repository.NewPrinterPairingRepository(pool),
		repository.NewPrintJobRepository(pool),
		cfg.PrinterJWTSecret,
	)
	printerReleases := service.NewPrinterReleaseService(os.DirFS(filepath.Join(cfg.PublicDir, "downloads")), cfg.PublicURL)
	handlers.Printer = httphandler.NewPrinterHandler(printerService, printerReleases)
	handlers.PrinterConnection = httphandler.NewPrinterConnectionHandler(printerService)

	adminAudit := repository.NewAdminAuditRepository(pool)
	adminAuditService := service.NewAdminAuditService(adminAudit)
	handlers.AdminOverview = httphandler.NewAdminOverviewHandler(
		service.NewAdminMetricsService(repository.NewAdminMetricsRepository(pool)), adminAuditService)
	handlers.AdminUser = httphandler.NewAdminUserHandler(
		service.NewAdminUserService(repository.NewAdminUserRepository(pool), adminAudit, bus))
	handlers.AdminBetaTester = httphandler.NewAdminBetaTesterHandler(
		service.NewBetaTesterService(repository.NewBetaTesterRepository(pool), bus, cfg.BetaAllowlistEnabled))
	handlers.AdminEstablishment = httphandler.NewAdminEstablishmentHandler(
		service.NewAdminEstablishmentService(repository.NewAdminEstablishmentRepository(pool), adminAudit, bus, valueCache))

	tableRepository := repository.NewTableRepository(pool)
	tableService := service.NewTableService(tableRepository, bus)
	orderService := service.NewOrderService(repository.NewOrderRepository(pool), tableRepository, bus)
	orderStock := service.NewOrderStock(productService)
	orderRealtime := service.NewOrderRealtime(realtime)
	handlers.Order = httphandler.NewOrderHandler(orderService)
	handlers.Table = httphandler.NewTableHandler(tableService)

	aiService := service.NewAIService(service.AIDependencies{
		Model:    ai.NewGateway(cfg.AIGatewayAPIKey),
		Usage:    repository.NewAIUsageRepository(pool),
		Security: security,
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
	handlers.AI = httphandler.NewAIHandler(aiService)

	for _, subscriber := range []ports.EventSubscriber{
		subscriptions, authEvents, catalogRealtime, shiftService, timeEntryService, establishmentService, userService,
		establishmentMemberService, adminAuditService, orderStock, orderRealtime,
	} {
		bus.Subscribe(subscriber.EventHandlers()...)
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
