package domain

import (
	"encoding/json"
	"time"
)

// PrintJobStatus is where a ticket in the queue stands.
type PrintJobStatus string

const (
	PrintJobPending  PrintJobStatus = "PENDING"
	PrintJobPrinting PrintJobStatus = "PRINTING"
	PrintJobPrinted  PrintJobStatus = "PRINTED"
	PrintJobFailed   PrintJobStatus = "FAILED"
)

const (
	// PrintJobStaleAfter is how long a job handed to the bridge can wait for its result
	// before it goes back to the queue.
	PrintJobStaleAfter = 2 * time.Minute
	// MaxPrintAttempts is how many times a job is handed to the bridge before it fails.
	MaxPrintAttempts = 3
	// MaxPrintErrorLength is how much of the reason of a failure is kept.
	MaxPrintErrorLength = 500
	// PrintJobAbandonedError is the error of a job the bridge never answered for.
	PrintJobAbandonedError = "The print bridge stopped responding while printing this ticket"
	// PrintJobUnexplainedError is the error of a failure the bridge gave no reason for.
	PrintJobUnexplainedError = "The bridge did not say why"
)

// PrintTicket is PrintTicketPayloadDto: what the bridge prints. The web app builds it.
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

// PrintTicketItem is PrintTicketItemDto, a line of the ticket.
type PrintTicketItem struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Price    string `json:"price"`
	Total    string `json:"total"`
}

// PrintJob is a ticket in the queue of an establishment. Its JSON is PrintJobDto.
type PrintJob struct {
	ID              string         `json:"id"`
	EstablishmentID string         `json:"-"`
	Status          PrintJobStatus `json:"status"`
	Error           *string        `json:"error"`
	CreatedAt       Time           `json:"createdAt"`
	CompletedAt     *Time          `json:"completedAt"`
}

// QueuedPrintJob is EnqueuePrintJobResponseDto.
type QueuedPrintJob struct {
	JobID string `json:"jobId"`
}

// ClaimedPrintJob is ClaimedPrintJobDto: a job handed to the bridge, with its ticket as it
// was stored.
type ClaimedPrintJob struct {
	ID      string          `json:"id"`
	Payload json.RawMessage `json:"payload"`
}

// PrintJobResult is PrintJobResultDto: whether the ticket made it onto paper and, if not,
// the reason the bridge gave.
type PrintJobResult struct {
	Printed bool
	Error   *string
}
