package domain

import "time"

// Shift is a shift on the rota, as the API sends it (Shift in @coaster/common).
type Shift struct {
	ID              string  `json:"id"`
	StartTime       Instant `json:"startTime"`
	EndTime         Instant `json:"endTime"`
	UserID          string  `json:"userId"`
	UserName        string  `json:"userName"`
	UserImage       *string `json:"userImage,omitempty"`
	EstablishmentID string  `json:"establishmentId"`
	Notes           *string `json:"notes,omitempty"`
}

// NewShift is what it takes to put somebody on the rota.
type NewShift struct {
	EstablishmentID string
	UserID          string
	StartTime       time.Time
	EndTime         time.Time
	Notes           *string
}

// ShiftExchangeStatus is where an offer to hand a shift over stands.
type ShiftExchangeStatus string

const (
	ShiftExchangePending  ShiftExchangeStatus = "PENDING"
	ShiftExchangeApproved ShiftExchangeStatus = "APPROVED"
	ShiftExchangeRejected ShiftExchangeStatus = "REJECTED"
)

// ShiftExchange is an offer to hand a shift over, as the API sends it (ShiftExchange in
// @coaster/common).
type ShiftExchange struct {
	ID             string              `json:"id"`
	ShiftID        string              `json:"shiftId"`
	RequesterID    string              `json:"requesterId"`
	TargetID       *string             `json:"targetId,omitempty"`
	Status         ShiftExchangeStatus `json:"status"`
	RequesterName  string              `json:"requesterName"`
	ShiftStartTime Instant             `json:"shiftStartTime"`
	ShiftEndTime   Instant             `json:"shiftEndTime"`
	CreatedAt      Instant             `json:"createdAt"`
}

// ShiftExchangeRecord is an exchange with what the rules need of its shift.
type ShiftExchangeRecord struct {
	ID                   string
	ShiftID              string
	RequesterID          string
	TargetID             *string
	Status               ShiftExchangeStatus
	ShiftEstablishmentID string
	ShiftStartTime       time.Time
}
