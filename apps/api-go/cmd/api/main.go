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

	"api-go/internal/adapter/event"
	httphandler "api-go/internal/adapter/handler/http"
	"api-go/internal/adapter/repository"
	"api-go/internal/config"
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

	router, err := httphandler.NewRouter(
		httphandler.RouterConfig{CORSOrigins: cfg.CORSOrigins, PublicDir: cfg.PublicDir},
		httphandler.Handlers{},
	)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:              net.JoinHostPort("0.0.0.0", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

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
