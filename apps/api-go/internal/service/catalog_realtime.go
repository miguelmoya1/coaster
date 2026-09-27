package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// CatalogRealtimeEvents are the events CatalogRealtime.Forward listens to.
var CatalogRealtimeEvents = []string{
	domain.CategoryCreatedEvent{}.Name(),
	domain.CategoryUpdatedEvent{}.Name(),
	domain.CategoryDeletedEvent{}.Name(),
	domain.ProductCreatedEvent{}.Name(),
	domain.ProductUpdatedEvent{}.Name(),
	domain.ProductStockChangedEvent{}.Name(),
	domain.ProductDeletedEvent{}.Name(),
	domain.CatalogueImportedEvent{}.Name(),
}

// CatalogRealtime tells the establishment's open screens that its categories or products
// changed: the category-*, product-* and catalogue-imported handlers of realtime/events.
type CatalogRealtime struct {
	realtime ports.Realtime
}

func NewCatalogRealtime(realtime ports.Realtime) *CatalogRealtime {
	return &CatalogRealtime{realtime: realtime}
}

// Forward sends the event to the establishment's stream. It subscribes to the EventPublisher
// for each of CatalogRealtimeEvents.
func (c *CatalogRealtime) Forward(_ context.Context, event ports.Event) {
	switch e := event.(type) {
	case domain.CategoryCreatedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeCategoryCreated, e.Category)
	case domain.CategoryUpdatedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeCategoryUpdated, e.Category)
	case domain.CategoryDeletedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeCategoryDeleted, catalogDeletedPayload{ID: e.CategoryID})
	case domain.ProductCreatedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeProductCreated, e.Product)
	case domain.ProductUpdatedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeProductUpdated, e.Product)
	case domain.ProductStockChangedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeProductStockChanged, e.Product)
	case domain.ProductDeletedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeProductDeleted, catalogDeletedPayload{ID: e.ProductID})
	case domain.CatalogueImportedEvent:
		c.realtime.Publish(e.EstablishmentID, domain.RealtimeCatalogueImported, catalogImportedPayload{EstablishmentID: e.EstablishmentID})
	}
}

// catalogDeletedPayload is the { id } the deleted events send.
type catalogDeletedPayload struct {
	ID string `json:"id"`
}

// catalogImportedPayload is the { establishmentId } of catalogueImported.
type catalogImportedPayload struct {
	EstablishmentID string `json:"establishmentId"`
}
