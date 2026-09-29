package e2e

import (
	"net/http"
	"testing"
)

func TestUnknownRoutes(t *testing.T) {
	api := newApp(t)

	t.Run("answers the 404 of Nest", func(t *testing.T) {
		body := api.get(t, "/no-such-route").expect(t, http.StatusNotFound).object(t)

		want := map[string]any{"statusCode": float64(404), "error": "Not Found", "message": "Cannot GET /api/v1/no-such-route"}
		for key, value := range want {
			if body[key] != value {
				t.Errorf("%s = %v, want %v", key, body[key], value)
			}
		}
		if len(body) != len(want) {
			t.Errorf("body = %v, want only %v", body, want)
		}
	})

	t.Run("answers it with a body too", func(t *testing.T) {
		body := api.post(t, "/no-such-route", map[string]any{"name": "anything"}).expect(t, http.StatusNotFound).object(t)

		if body["message"] != "Cannot POST /api/v1/no-such-route" {
			t.Errorf("message = %v", body["message"])
		}
	})
}
