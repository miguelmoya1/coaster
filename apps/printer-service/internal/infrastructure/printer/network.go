package printer

import (
	"context"
	"fmt"
	"net"
)

type NetworkPrinter struct {
	Address string // IP:Port e.g., "192.168.1.200:9100"
	conn    net.Conn
}

func NewNetworkPrinter(address string) *NetworkPrinter {
	return &NetworkPrinter{Address: address}
}

func (n *NetworkPrinter) Connect(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", n.Address)
	if err != nil {
		return fmt.Errorf("error connecting to network printer: %w", err)
	}
	n.conn = conn
	return nil
}

func (n *NetworkPrinter) Write(b []byte) (int, error) {
	if n.conn == nil {
		return 0, fmt.Errorf("network printer not connected")
	}
	return n.conn.Write(b)
}

func (n *NetworkPrinter) Close() error {
	if n.conn != nil {
		return n.conn.Close()
	}
	return nil
}
