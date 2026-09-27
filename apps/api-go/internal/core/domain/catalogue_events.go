package domain

// CatalogueImportedEvent is catalogue-imported.event.ts: the starter catalogue was imported.
type CatalogueImportedEvent struct {
	EstablishmentID string
}

func (CatalogueImportedEvent) Name() string { return "CatalogueImportedEvent" }
