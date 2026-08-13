package relay

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	"printer-service/internal/config"
	"printer-service/internal/domain"
	"printer-service/internal/escpos"
	"printer-service/internal/usecase"
)

const (
	pollTimeout   = 40 * time.Second
	resultTimeout = 15 * time.Second

	minBackoff  = 2 * time.Second
	maxBackoff  = 2 * time.Minute
	maxJobBytes = 1 << 20
)

type Job struct {
	ID      string               `json:"id"`
	Payload escpos.TicketPayload `json:"payload"`
}

type result struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

type Client struct {
	baseURL         string
	establishmentID string
	deviceKey       string
	http            *http.Client
}

func NewClient(cfg *config.Config) *Client {
	return &Client{
		baseURL:         cfg.APIURL,
		establishmentID: cfg.EstablishmentID,
		deviceKey:       cfg.DeviceKey,
		http:            &http.Client{Timeout: pollTimeout + 10*time.Second},
	}
}

var errUnauthorized = errors.New("device key rejected")

func Run(ctx context.Context, cfg *config.Config, printUC *usecase.PrintTicketUseCase, renderer *escpos.Renderer) {
	client := NewClient(cfg)
	backoff := minBackoff

	log.Printf("Relay started for establishment %s against %s\n", cfg.EstablishmentID, cfg.APIURL)

	for {
		if ctx.Err() != nil {
			return
		}

		job, err := client.NextJob(ctx)
		switch {
		case ctx.Err() != nil:
			return

		case errors.Is(err, errUnauthorized):
			log.Printf("Relay: %v. Check -device-key and -establishment-id; retrying in %s\n", err, maxBackoff)
			if !sleep(ctx, maxBackoff) {
				return
			}
			continue

		case err != nil:
			log.Printf("Relay: could not fetch print jobs (%v); retrying in %s\n", err, backoff)
			if !sleep(ctx, backoff) {
				return
			}
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		backoff = minBackoff

		if job == nil {
			if !sleep(ctx, cfg.PollInterval) {
				return
			}
			continue
		}

		client.report(ctx, job.ID, print(ctx, job, printUC, renderer))
	}
}

func print(ctx context.Context, job *Job, printUC *usecase.PrintTicketUseCase, renderer *escpos.Renderer) error {
	ticket := domain.Ticket{ID: job.ID, Content: renderer.Render(job.Payload)}
	if err := printUC.Execute(ctx, ticket); err != nil {
		log.Printf("Relay: job %s failed to print: %v\n", job.ID, err)
		return err
	}
	log.Printf("Relay: job %s printed\n", job.ID)
	return nil
}

func (c *Client) NextJob(ctx context.Context) (*Job, error) {
	ctx, cancel := context.WithTimeout(ctx, pollTimeout+5*time.Second)
	defer cancel()

	endpoint := fmt.Sprintf("%s/printer/jobs/next?establishmentId=%s", c.baseURL, url.QueryEscape(c.establishmentID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Device-Key", c.deviceKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNoContent:
		return nil, nil
	case http.StatusOK:
		var job Job
		if err := json.NewDecoder(io.LimitReader(resp.Body, maxJobBytes)).Decode(&job); err != nil {
			return nil, fmt.Errorf("could not parse print job: %w", err)
		}
		if job.ID == "" {
			return nil, errors.New("API returned a print job without an id")
		}
		return &job, nil
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, errUnauthorized
	default:
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, bytes.TrimSpace(body))
	}
}

func (c *Client) report(ctx context.Context, jobID string, printErr error) {
	body := result{Status: "printed"}
	if printErr != nil {
		body = result{Status: "failed", Error: printErr.Error()}
	}

	if err := c.postResult(ctx, jobID, body); err != nil {
		log.Printf("Relay: could not report the result of job %s: %v\n", jobID, err)
	}
}

func (c *Client) postResult(ctx context.Context, jobID string, body result) error {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), resultTimeout)
	defer cancel()

	encoded, err := json.Marshal(body)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/printer/jobs/%s/result?establishmentId=%s",
		c.baseURL, url.PathEscape(jobID), url.QueryEscape(c.establishmentID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(encoded))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-Key", c.deviceKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return nil
}

func sleep(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return ctx.Err() == nil
	}

	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
