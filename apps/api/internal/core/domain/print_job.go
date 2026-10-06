package domain

import (
	"encoding/json"
	"time"
)

type PrintJobStatus string

const (
	PrintJobPending  PrintJobStatus = "PENDING"
	PrintJobPrinting PrintJobStatus = "PRINTING"
	PrintJobPrinted  PrintJobStatus = "PRINTED"
	PrintJobFailed   PrintJobStatus = "FAILED"
)

const (
	PrintJobStaleAfter = 2 * time.Minute

	MaxPrintAttempts = 3

	MaxPrintErrorLength = 500

	PrintJobAbandonedError = "The print bridge stopped responding while printing this ticket"

	PrintJobUnexplainedError = "The bridge did not say why"
)

type PrintTicket struct {
	Type              string             `json:"type"`
	EstablishmentName *string            `json:"establishmentName,omitempty"`
	Table             *string            `json:"table,omitempty"`
	Date              *string            `json:"date,omitempty"`
	Items             *[]PrintTicketItem `json:"items,omitempty"`
	Total             *string            `json:"total,omitempty"`
	Currency          *string            `json:"currency,omitempty"`
	Notes             *string            `json:"notes,omitempty"`
	RawText           *string            `json:"rawText,omitempty"`
}

type PrintTicketItem struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Price    string `json:"price"`
	Total    string `json:"total"`
}

type PrintJob struct {
	ID              string         `json:"id"`
	EstablishmentID string         `json:"-"`
	Status          PrintJobStatus `json:"status"`
	Error           *string        `json:"error"`
	CreatedAt       Time           `json:"createdAt"`
	CompletedAt     *Time          `json:"completedAt"`
}

type QueuedPrintJob struct {
	JobID string `json:"jobId"`
}

type ClaimedPrintJob struct {
	ID      string          `json:"id"`
	Payload json.RawMessage `json:"payload"`
}

type PrintJobResult struct {
	Printed bool
	Error   *string
}
