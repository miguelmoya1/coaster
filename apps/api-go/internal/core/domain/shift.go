package domain

import "time"

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

type NewShift struct {
	EstablishmentID string
	UserID          string
	StartTime       time.Time
	EndTime         time.Time
	Notes           *string
}

type ShiftExchangeStatus string

const (
	ShiftExchangePending  ShiftExchangeStatus = "PENDING"
	ShiftExchangeApproved ShiftExchangeStatus = "APPROVED"
	ShiftExchangeRejected ShiftExchangeStatus = "REJECTED"
)

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

type ShiftExchangeRecord struct {
	ID                   string
	ShiftID              string
	RequesterID          string
	TargetID             *string
	Status               ShiftExchangeStatus
	ShiftEstablishmentID string
	ShiftStartTime       time.Time
}
