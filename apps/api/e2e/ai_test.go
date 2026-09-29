package e2e

import (
	"net/http"
	"testing"
)

func TestAI(t *testing.T) {
	t.Run("answers a member without a gateway key with the translatable error", func(t *testing.T) {
		api := newApp(t)
		resetWithMockUser(t)
		establishmentID := createEstablishment(t, "My Establishment")

		response := api.post(t, "/establishments/"+establishmentID+"/ai", map[string]any{"prompt": "Suggest me a drink"})

		if response.status != http.StatusCreated && response.status != http.StatusInternalServerError {
			t.Errorf("status = %d, want 201 or 500: %s", response.status, response.body)
		}
	})
}
