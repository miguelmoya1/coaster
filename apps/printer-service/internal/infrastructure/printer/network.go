package printer

import (
	"context"
	"fmt"
	"net"
	"time"
)

const DefaultPort = "9100"

const writeTimeout = 10 * time.Second

type NetworkPrinter struct {
	Address string
	conn    net.Conn
}

func NewNetworkPrinter(address string) *NetworkPrinter {
	return &NetworkPrinter{Address: withDefaultPort(address)}
}

func withDefaultPort(address string) string {
	if _, _, err := net.SplitHostPort(address); err == nil {
		return address
	}
	return net.JoinHostPort(address, DefaultPort)
}

func (n *NetworkPrinter) Connect(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", n.Address)
	if err != nil {
		return fmt.Errorf("error connecting to network printer at %s: %w", n.Address, err)
	}
	n.conn = conn
	return nil
}

func (n *NetworkPrinter) Write(b []byte) (int, error) {
	if n.conn == nil {
		return 0, fmt.Errorf("network printer not connected")
	}
	if err := n.conn.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return 0, fmt.Errorf("could not set write deadline: %w", err)
	}
	return n.conn.Write(b)
}

func (n *NetworkPrinter) Close() error {
	if n.conn == nil {
		return nil
	}
	err := n.conn.Close()
	n.conn = nil
	return err
}

func (n *NetworkPrinter) String() string {
	return "network:" + n.Address
}
