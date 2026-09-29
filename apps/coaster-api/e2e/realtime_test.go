package e2e

import (
	"bufio"
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

const streamWait = 5 * time.Second

type stream struct {
	response *http.Response
	lines    chan string
}

func openStream(t *testing.T, api *app, establishmentID, userID string) *stream {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, api.url+"/api/v1/establishments/"+establishmentID+"/events", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer "+api.token(t, userID))
	request.Header.Set("Accept", "text/event-stream")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("opening the stream: %v", err)
	}
	t.Cleanup(func() { response.Body.Close() })

	s := &stream{response: response, lines: make(chan string)}
	go func() {
		defer close(s.lines)
		scanner := bufio.NewScanner(response.Body)
		for scanner.Scan() {
			s.lines <- scanner.Text()
		}
	}()

	return s
}

func (s *stream) readUntil(t *testing.T, text string) string {
	t.Helper()

	var seen strings.Builder
	timeout := time.After(streamWait)
	for {
		select {
		case line, open := <-s.lines:
			if !open {
				t.Fatalf("the stream ended before %q:\n%s", text, seen.String())
			}
			seen.WriteString(line + "\n")
			if strings.Contains(seen.String(), text) {
				return seen.String()
			}
		case <-timeout:
			t.Fatalf("no %q within %s:\n%s", text, streamWait, seen.String())
		}
	}
}

func (s *stream) waitUntilClosed(t *testing.T) {
	t.Helper()

	timeout := time.After(streamWait)
	for {
		select {
		case _, open := <-s.lines:
			if !open {
				return
			}
		case <-timeout:
			t.Fatalf("the stream was still open after %s", streamWait)
		}
	}
}

func TestRealtime(t *testing.T) {
	staff := user{id: "00000000-0000-4000-8000-0000000000b1", email: "staff@example.com", name: "Staff"}
	outsider := user{id: "00000000-0000-4000-8000-0000000000b2", email: "outsider@example.com", name: "Outsider"}

	type bar struct {
		id            string
		staffMemberID string
	}

	setup := func(t *testing.T) bar {
		resetWithMockUser(t)
		createUser(t, staff)
		createUser(t, outsider)
		id := createEstablishment(t, "The Bar")
		return bar{id: id, staffMemberID: addMember(t, id, staff.id, domain.EstablishmentRoleStaff)}
	}

	createTable := func(t *testing.T, api *app, establishmentID, name string) {
		api.post(t, "/establishments/"+establishmentID+"/tables", map[string]any{"name": name}).expect(t, http.StatusCreated)
	}

	t.Run("refuses the stream to somebody who does not belong", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)

		if status := openStream(t, api, b.id, outsider.id).response.StatusCode; status != http.StatusForbidden {
			t.Errorf("status = %d, want 403", status)
		}
	})

	t.Run("opens an event stream for a member", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)

		s := openStream(t, api, b.id, staff.id)

		if s.response.StatusCode != http.StatusOK || !strings.Contains(s.response.Header.Get("Content-Type"), "text/event-stream") {
			t.Errorf("status %d, content type %q, want an event stream", s.response.StatusCode, s.response.Header.Get("Content-Type"))
		}
	})

	t.Run("delivers what happens in the establishment", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		s := openStream(t, api, b.id, staff.id)
		s.readUntil(t, ": open")

		createTable(t, api, b.id, "Terraza 1")

		frames := s.readUntil(t, "Terraza 1")
		if !strings.Contains(frames, "event: tableCreated") {
			t.Errorf("frames = %s, want a tableCreated event", frames)
		}
	})

	t.Run("does not leak what happens in another establishment", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		otherID := createEstablishment(t, "Another Bar")
		s := openStream(t, api, b.id, staff.id)
		s.readUntil(t, ": open")

		createTable(t, api, otherID, "Their Table")
		createTable(t, api, b.id, "Our Table")

		if frames := s.readUntil(t, "Our Table"); strings.Contains(frames, "Their Table") {
			t.Errorf("the stream of The Bar got a table of Another Bar:\n%s", frames)
		}
	})

	t.Run("closes the stream of somebody removed from the establishment", func(t *testing.T) {
		api := newApp(t)
		b := setup(t)
		s := openStream(t, api, b.id, staff.id)
		s.readUntil(t, ": open")

		api.delete(t, "/establishments/"+b.id+"/members/"+b.staffMemberID).expect(t, http.StatusOK)

		s.waitUntilClosed(t)
	})
}
