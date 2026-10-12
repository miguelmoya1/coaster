package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"coaster-database"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{ReplaceAttr: cloudLoggingNames})))

	if err := run(); err != nil {
		slog.Error("the migrations failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return errors.New("DATABASE_URL environment variable is required")
	}

	return database.Migrate(ctx, databaseURL)
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
