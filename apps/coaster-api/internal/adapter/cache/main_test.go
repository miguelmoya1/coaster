package cache

import (
	"context"
	"log"
	"os"
	"testing"

	"github.com/redis/go-redis/v9"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

var testClient *redis.Client

func TestMain(m *testing.M) {
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx := context.Background()

	container, err := testcontainers.Run(ctx, "redis:8-alpine",
		testcontainers.WithExposedPorts("6379/tcp"),
		testcontainers.WithWaitStrategy(wait.ForListeningPort("6379/tcp")),
	)
	if err != nil {
		log.Printf("starting redis: %v", err)
		return 1
	}
	defer func() {
		if err := testcontainers.TerminateContainer(container); err != nil {
			log.Printf("stopping redis: %v", err)
		}
	}()

	url, err := container.PortEndpoint(ctx, "6379/tcp", "redis")
	if err != nil {
		log.Printf("reading the redis address: %v", err)
		return 1
	}

	testClient = NewClient(url)
	defer testClient.Close()

	return m.Run()
}

func resetRedis(t *testing.T) {
	t.Helper()

	if err := testClient.FlushAll(context.Background()).Err(); err != nil {
		t.Fatalf("emptying redis: %v", err)
	}
}
