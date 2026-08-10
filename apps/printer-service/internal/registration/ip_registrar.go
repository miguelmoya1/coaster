package registration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strconv"
	"time"

	"printer-service/internal/config"
)

const heartbeat = 30 * time.Second

const requestTimeout = 10 * time.Second

func GetLocalIP() (string, error) {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		if addr, ok := conn.LocalAddr().(*net.UDPAddr); ok {
			return addr.IP.String(), nil
		}
	}

	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String(), nil
			}
		}
	}

	return "", fmt.Errorf("no external IPv4 address found")
}

func StartIPRegistration(ctx context.Context, cfg *config.Config) {
	client := &http.Client{Timeout: requestTimeout}

	ticker := time.NewTicker(heartbeat)
	defer ticker.Stop()

	register(ctx, client, cfg)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			register(ctx, client, cfg)
		}
	}
}

func register(ctx context.Context, client *http.Client, cfg *config.Config) {
	ip := cfg.IPAddress
	if ip == "" {
		var err error
		ip, err = GetLocalIP()
		if err != nil {
			log.Printf("Error detecting local IP: %v\n", err)
			return
		}
	}

	port, err := strconv.Atoi(cfg.Port)
	if err != nil {
		log.Printf("Cannot register: %q is not a valid port\n", cfg.Port)
		return
	}

	payload := map[string]any{
		"establishmentId": cfg.EstablishmentID,
		"ipAddress":       ip,
		"port":            port,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling registration payload: %v\n", err)
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.APIURL+"/printer/register-ip", bytes.NewReader(body))
	if err != nil {
		log.Printf("Error creating registration request: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-Key", cfg.DeviceKey)

	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() == nil {
			log.Printf("Error sending IP registration request: %v\n", err)
		}
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		log.Printf("IP registration failed with status %d: %s\n", resp.StatusCode, bytes.TrimSpace(respBody))
		return
	}

	log.Printf("Registered %s:%d for establishment %s\n", ip, port, cfg.EstablishmentID)
}
