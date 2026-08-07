package printer_test

import (
	"context"
	"io"
	"net"
	"testing"
	"time"

	"printer-service/internal/infrastructure/printer"
)

func TestNetworkPrinter_Success(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to start test listener: %v", err)
	}
	defer l.Close()

	errChan := make(chan error, 1)
	go func() {
		conn, err := l.Accept()
		if err != nil {
			errChan <- err
			return
		}
		defer conn.Close()

		buf, err := io.ReadAll(conn)
		if err != nil {
			errChan <- err
			return
		}
		if string(buf) != "test_print_data" {
			errChan <- io.ErrUnexpectedEOF
			return
		}
		errChan <- nil
	}()

	np := printer.NewNetworkPrinter(l.Addr().String())

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := np.Connect(ctx); err != nil {
		t.Fatalf("expected connect to succeed, got %v", err)
	}

	n, err := np.Write([]byte("test_print_data"))
	if err != nil {
		t.Errorf("expected write to succeed, got %v", err)
	}
	if n != len("test_print_data") {
		t.Errorf("expected to write %d bytes, wrote %d", len("test_print_data"), n)
	}

	if err := np.Close(); err != nil {
		t.Errorf("expected close to succeed, got %v", err)
	}

	if err := <-errChan; err != nil {
		t.Errorf("server background error: %v", err)
	}
}

func TestNetworkPrinter_ConnectFail(t *testing.T) {
	np := printer.NewNetworkPrinter("127.0.0.1:99999")

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := np.Connect(ctx)
	if err == nil {
		t.Error("expected connect to fail with invalid address")
	}
}

func TestNetworkPrinter_WriteWithoutConnect(t *testing.T) {
	np := printer.NewNetworkPrinter("127.0.0.1:0")

	_, err := np.Write([]byte("test"))
	if err == nil {
		t.Error("expected write to fail without connection")
	}
}
