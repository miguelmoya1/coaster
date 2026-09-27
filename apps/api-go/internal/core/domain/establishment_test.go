package domain

import (
	"encoding/json"
	"slices"
	"testing"
	"time"
)

func TestEstablishmentJSON(t *testing.T) {
	created := NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC))
	updated := NewTime(time.Date(2026, 9, 27, 11, 30, 0, 0, time.UTC))

	raw, err := json.Marshal(Establishment{ID: "e1", Name: "Bar Pepe", CreatedAt: created, UpdatedAt: updated})
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"e1","name":"Bar Pepe","createdAt":"2026-09-27T10:00:00.000Z","updatedAt":"2026-09-27T11:30:00.000Z"}`
	if string(raw) != want {
		t.Errorf("got %s, want %s", raw, want)
	}
}

func TestEstablishmentSettingsResolved(t *testing.T) {
	stored := EstablishmentSettings{EstablishmentID: "e1", Modules: []EstablishmentModule{ModuleOrders}, Language: "de"}

	got := stored.Resolved()

	want := []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}
	if !slices.Equal(got.Modules, want) || got.Language != "es" || got.EstablishmentID != "e1" {
		t.Errorf("Resolved() = %+v", got)
	}
	if len(stored.Modules) != 1 {
		t.Errorf("Resolved changed the settings it was called on: %+v", stored)
	}
}

func TestEstablishmentSettingsJSON(t *testing.T) {
	configured := NewTime(time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC))

	tests := []struct {
		name     string
		settings EstablishmentSettings
		want     string
	}{
		{
			name:     "without a settings row",
			settings: DefaultEstablishmentSettings("e1"),
			want:     `{"establishmentId":"e1","modules":["TIME_TRACKING","ORDERS","INVENTORY"],"language":"es","markSoldOut":false,"configuredAt":null}`,
		},
		{
			name: "configured",
			settings: EstablishmentSettings{
				EstablishmentID: "e1", Modules: []EstablishmentModule{ModuleTimeTracking}, Language: "en", MarkSoldOut: true, ConfiguredAt: &configured,
			},
			want: `{"establishmentId":"e1","modules":["TIME_TRACKING"],"language":"en","markSoldOut":true,"configuredAt":"2026-09-27T10:00:00.000Z"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, err := json.Marshal(tt.settings)
			if err != nil {
				t.Fatal(err)
			}
			if string(raw) != tt.want {
				t.Errorf("got %s, want %s", raw, tt.want)
			}
		})
	}
}
