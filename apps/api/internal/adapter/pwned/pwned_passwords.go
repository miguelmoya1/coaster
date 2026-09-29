package pwned

import (
	"bufio"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const RangeURL = "https://api.pwnedpasswords.com/range/"

const timeout = 2500 * time.Millisecond

type Passwords struct {
	enabled  bool
	rangeURL string
	client   *http.Client
}

func NewPasswords(enabled bool) *Passwords {
	return &Passwords{enabled: enabled, rangeURL: RangeURL, client: &http.Client{Timeout: timeout}}
}

func (p *Passwords) Compromised(ctx context.Context, password string) bool {
	if !p.enabled {
		return false
	}

	sum := sha1.Sum([]byte(password))
	digest := strings.ToUpper(hex.EncodeToString(sum[:]))

	body, ok := p.rangeOf(ctx, digest[:5])
	if !ok {
		return false
	}

	return appearancesOf(body, digest[5:]) > 0
}

func (p *Passwords) rangeOf(ctx context.Context, prefix string) (string, bool) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, p.rangeURL+prefix, nil)
	if err != nil {
		return "", false
	}
	request.Header.Set("Add-Padding", "true")
	request.Header.Set("User-Agent", "coaster")

	response, err := p.client.Do(request)
	if err != nil {
		slog.Warn("could not ask Have I Been Pwned; letting the password through", "error", err)
		return "", false
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode > 299 {
		slog.Warn("Have I Been Pwned did not answer; letting the password through", "status", response.StatusCode)
		return "", false
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		slog.Warn("could not read Have I Been Pwned; letting the password through", "error", err)
		return "", false
	}

	return string(body), true
}

func appearancesOf(body, suffix string) int {
	scanner := bufio.NewScanner(strings.NewReader(body))
	for scanner.Scan() {
		candidate, count, _ := strings.Cut(strings.TrimSpace(scanner.Text()), ":")
		if candidate == suffix {
			appearances, _ := strconv.Atoi(count)
			return appearances
		}
	}

	return 0
}
