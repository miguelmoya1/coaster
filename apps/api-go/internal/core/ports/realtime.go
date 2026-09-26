package ports

// Realtime sends a message to everyone connected to an establishment's stream
// (RealtimeService in Nest). event is one of the domain.Realtime* names and payload is
// written as JSON.
type Realtime interface {
	Publish(establishmentID string, event string, payload any)
	// Revoke closes the streams a person has open on an establishment.
	Revoke(establishmentID string, userID string)
}
