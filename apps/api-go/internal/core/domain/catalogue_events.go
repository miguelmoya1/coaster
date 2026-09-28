package domain

type CatalogueImportedEvent struct {
	EstablishmentID string
}

func (CatalogueImportedEvent) Name() string { return "CatalogueImportedEvent" }
