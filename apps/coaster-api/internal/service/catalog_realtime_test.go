package service

import (
	"context"
	"encoding/json"
	"testing"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

func TestCatalogRealtimeForward(t *testing.T) {
	category := domain.Category{ID: "cat-1", EstablishmentID: "est-1", Name: "Drinks", TaxRate: 1000}
	product := domain.Product{ID: "prod-1", CategoryID: "cat-1", Name: "Beer", Allergens: []string{}}

	tests := []struct {
		event       ports.Event
		wantEvent   string
		wantPayload string
	}{
		{event: domain.CategoryCreatedEvent{EstablishmentID: "est-1", Category: category}, wantEvent: "categoryCreated",
			wantPayload: `{"id":"cat-1","establishmentId":"est-1","name":"Drinks","taxRate":1000}`},
		{event: domain.CategoryUpdatedEvent{EstablishmentID: "est-1", Category: category}, wantEvent: "categoryUpdated",
			wantPayload: `{"id":"cat-1","establishmentId":"est-1","name":"Drinks","taxRate":1000}`},
		{event: domain.CategoryDeletedEvent{EstablishmentID: "est-1", CategoryID: "cat-1"}, wantEvent: "categoryDeleted",
			wantPayload: `{"id":"cat-1"}`},
		{event: domain.ProductCreatedEvent{EstablishmentID: "est-1", Product: product}, wantEvent: "productCreated"},
		{event: domain.ProductUpdatedEvent{EstablishmentID: "est-1", Product: product}, wantEvent: "productUpdated"},
		{event: domain.ProductStockChangedEvent{EstablishmentID: "est-1", Product: product}, wantEvent: "productStockChanged"},
		{event: domain.ProductDeletedEvent{EstablishmentID: "est-1", ProductID: "prod-1"}, wantEvent: "productDeleted",
			wantPayload: `{"id":"prod-1"}`},
		{event: domain.CatalogueImportedEvent{EstablishmentID: "est-1"}, wantEvent: "catalogueImported",
			wantPayload: `{"establishmentId":"est-1"}`},
	}

	if len(tests) != len(CatalogRealtimeEvents) {
		t.Fatalf("the test covers %d events, CatalogRealtimeEvents lists %d", len(tests), len(CatalogRealtimeEvents))
	}

	for _, tt := range tests {
		t.Run(tt.event.Name(), func(t *testing.T) {
			realtime := &catalogRealtimeFake{}

			NewCatalogRealtime(realtime).Forward(context.Background(), tt.event)

			if len(realtime.sent) != 1 || realtime.sent[0].establishmentID != "est-1" || realtime.sent[0].event != tt.wantEvent {
				t.Fatalf("sent = %+v", realtime.sent)
			}

			if tt.wantPayload != "" {
				payload, _ := json.Marshal(realtime.sent[0].payload)
				if string(payload) != tt.wantPayload {
					t.Errorf("payload = %s, want %s", payload, tt.wantPayload)
				}
			}
		})
	}
}
