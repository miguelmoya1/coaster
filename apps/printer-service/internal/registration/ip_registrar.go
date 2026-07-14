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
	"time"

	"printer-service/internal/config"
)

func GetLocalIP() (string, error) {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		localAddr := conn.LocalAddr().(*net.UDPAddr)
		return localAddr.IP.String(), nil
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
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	register := func() {
		ip := cfg.IPAddress
		if ip == "" {
			var err error
			ip, err = GetLocalIP()
			if err != nil {
				log.Printf("Error detecting local IP: %v\n", err)
				return
			}
		}

		payload := map[string]string{
			"barId":     cfg.BarID,
			"ipAddress": ip,
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

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Error sending IP registration request: %v\n", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			respBody, _ := io.ReadAll(resp.Body)
			log.Printf("IP registration failed with status %d: %s\n", resp.StatusCode, string(respBody))
			return
		}

		log.Printf("Successfully registered IP address %s for bar %s\n", ip, cfg.BarID)
	}

	register()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			register()
		}
	}
}
