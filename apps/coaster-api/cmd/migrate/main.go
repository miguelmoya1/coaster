package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"coaster-api/internal/adapter/logging"
	"coaster-api/internal/adapter/repository"
	"coaster-api/internal/config"
)

func main() {
	slog.SetDefault(logging.NewCloudLogger(os.Stdout))

	if err := run(); err != nil {
		slog.Error("the migrations failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	databaseURL, err := config.DatabaseURL()
	if err != nil {
		return err
	}

	return repository.Migrate(ctx, databaseURL)
}
