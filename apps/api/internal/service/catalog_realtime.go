package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type CatalogRealtime struct {
	realtime ports.Realtime
}

func NewCatalogRealtime(realtime ports.Realtime) *CatalogRealtime {
	return &CatalogRealtime{realtime: realtime}
}

func (c *CatalogRealtime) EventHandlers() []ports.EventHandler {
	return []ports.EventHandler{
		ports.On(func(_ context.Context, event domain.CategoryCreatedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeCategoryCreated, event.Category)
		}),
		ports.On(func(_ context.Context, event domain.CategoryUpdatedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeCategoryUpdated, event.Category)
		}),
		ports.On(func(_ context.Context, event domain.CategoryDeletedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeCategoryDeleted, catalogDeletedPayload{ID: event.CategoryID})
		}),
		ports.On(func(_ context.Context, event domain.ProductCreatedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeProductCreated, event.Product)
		}),
		ports.On(func(_ context.Context, event domain.ProductUpdatedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeProductUpdated, event.Product)
		}),
		ports.On(func(_ context.Context, event domain.ProductStockChangedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeProductStockChanged, event.Product)
		}),
		ports.On(func(_ context.Context, event domain.ProductDeletedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeProductDeleted, catalogDeletedPayload{ID: event.ProductID})
		}),
		ports.On(func(_ context.Context, event domain.CatalogueImportedEvent) {
			c.realtime.Publish(event.EstablishmentID, domain.RealtimeCatalogueImported, catalogImportedPayload{EstablishmentID: event.EstablishmentID})
		}),
	}
}

type catalogDeletedPayload struct {
	ID string `json:"id"`
}

type catalogImportedPayload struct {
	EstablishmentID string `json:"establishmentId"`
}
