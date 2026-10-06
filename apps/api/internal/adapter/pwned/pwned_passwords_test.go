package pwned

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

const (
	prefix = "CBFDA"
	suffix = "C6008F9CAB4083784CBD1874F76618D2A97"
)

func newTestPasswords(t *testing.T, handler http.HandlerFunc) *Passwords {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	passwords := NewPasswords(true)
	passwords.rangeURL = server.URL + "/range/"
	return passwords
}

func TestCompromised(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		want   bool
	}{
		{name: "in the corpus", status: 200, body: "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n" + suffix + ":2401761\r\n", want: true},
		{name: "not in the corpus", status: 200, body: "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"},
		{name: "padding line", status: 200, body: suffix + ":0\r\n"},
		{name: "service down", status: 503, body: suffix + ":5\r\n"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passwords := newTestPasswords(t, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/range/"+prefix || r.Header.Get("Add-Padding") != "true" || r.Header.Get("User-Agent") != "coaster" {
					t.Errorf("request = %s %v", r.URL.Path, r.Header)
				}
				w.WriteHeader(tt.status)
				w.Write([]byte(tt.body))
			})

			if got := passwords.Compromised(context.Background(), "password123"); got != tt.want {
				t.Fatalf("Compromised = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCompromisedDisabled(t *testing.T) {
	passwords := newTestPasswords(t, func(http.ResponseWriter, *http.Request) {
		t.Errorf("a disabled check must not call the service")
	})
	passwords.enabled = false

	if passwords.Compromised(context.Background(), "password123") {
		t.Fatalf("a disabled check must let every password through")
	}
}

func TestCompromisedTimesOut(t *testing.T) {
	passwords := newTestPasswords(t, func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	})
	passwords.client.Timeout = 50 * time.Millisecond

	if passwords.Compromised(context.Background(), "password123") {
		t.Fatalf("a slow service must let the password through")
	}
}
