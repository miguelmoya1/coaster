package service

import (
	"encoding/json"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestCatalogRealtimeForward(t *testing.T) {
	category := domain.Category{ID: "cat-1", EstablishmentID: "est-1", Name: "Drinks", TaxRate: 1000}
	product := domain.Product{ID: "prod-1", CategoryID: "cat-1", Name: "Beer", Allergens: []string{}}

	tests := []struct {
		event       any
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

	if handlers := NewCatalogRealtime(nil).EventHandlers(); len(tests) != len(handlers) {
		t.Fatalf("the test covers %d events, CatalogRealtime listens to %d", len(tests), len(handlers))
	}

	for _, tt := range tests {
		t.Run(eventName(tt.event), func(t *testing.T) {
			realtime := &realtimeRecorder{}

			deliver(NewCatalogRealtime(realtime).EventHandlers(), tt.event)

			if len(realtime.messages) != 1 || realtime.messages[0].establishmentID != "est-1" || realtime.messages[0].event != tt.wantEvent {
				t.Fatalf("sent = %+v", realtime.messages)
			}

			if tt.wantPayload != "" {
				payload, _ := json.Marshal(realtime.messages[0].payload)
				if string(payload) != tt.wantPayload {
					t.Errorf("payload = %s, want %s", payload, tt.wantPayload)
				}
			}
		})
	}
}
