package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// GenesisHash is the prevHash of the first row of an establishment's chain.
var GenesisHash = strings.Repeat("0", 64)

// ChainPayload is what the hash of a row covers. It has to stay exactly as it is in Nest
// (time-entry-chain.ts), or the rows Nest wrote would stop verifying.
type ChainPayload struct {
	ID              string
	EstablishmentID string
	UserID          string
	RootID          string
	Type            TimeEntryType
	Action          TimeEntryAction
	OccurredAt      time.Time
	RecordedAt      time.Time
	WorkdayDate     time.Time
	UserSnapshot    TimeEntrySnapshot
	Source          TimeEntrySource
	SupersedesID    *string
	ActorID         string
	Reason          *string
	Sequence        int64
}

// ChainPayloadOf is the part of a stored row the hash covers.
func ChainPayloadOf(row TimeEntryRow) ChainPayload {
	return ChainPayload{
		ID:              row.ID,
		EstablishmentID: row.EstablishmentID,
		UserID:          row.UserID,
		RootID:          row.RootID,
		Type:            row.Type,
		Action:          row.Action,
		OccurredAt:      row.OccurredAt,
		RecordedAt:      row.RecordedAt,
		WorkdayDate:     row.WorkdayDate,
		UserSnapshot:    row.UserSnapshot,
		Source:          row.Source,
		SupersedesID:    row.SupersedesID,
		ActorID:         row.ActorID,
		Reason:          row.Reason,
		Sequence:        row.Sequence,
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func canonical(payload ChainPayload) string {
	return strings.Join([]string{
		payload.ID,
		payload.EstablishmentID,
		payload.UserID,
		payload.RootID,
		string(payload.Type),
		string(payload.Action),
		FormatISO(payload.OccurredAt),
		FormatISO(payload.RecordedAt),
		FormatWorkdayDate(payload.WorkdayDate),
		payload.UserSnapshot.Name,
		payload.UserSnapshot.Email,
		string(payload.Source),
		valueOrEmpty(payload.SupersedesID),
		payload.ActorID,
		valueOrEmpty(payload.Reason),
		strconv.FormatInt(payload.Sequence, 10),
	}, "|")
}

// HashTimeEntry is the SHA-256, in hex, of the previous hash and the row.
func HashTimeEntry(payload ChainPayload, prevHash string) string {
	sum := sha256.Sum256([]byte(prevHash + "|" + canonical(payload)))
	return hex.EncodeToString(sum[:])
}

// ChainVerification is what VerifyChain found.
type ChainVerification struct {
	Valid    bool
	BrokenAt *string
	Checked  int
}

// VerifyChain walks the rows in sequence order and stops at the first one that does not
// link to the previous one or whose hash does not match its content.
func VerifyChain(rows []TimeEntryRow) ChainVerification {
	previousHash := GenesisHash
	var previousSequence int64

	for _, row := range rows {
		linked := row.PrevHash == previousHash && row.Sequence == previousSequence+1

		if !linked || HashTimeEntry(ChainPayloadOf(row), row.PrevHash) != row.Hash {
			brokenAt := row.ID
			return ChainVerification{Valid: false, BrokenAt: &brokenAt, Checked: len(rows)}
		}

		previousHash = row.Hash
		previousSequence = row.Sequence
	}

	return ChainVerification{Valid: true, Checked: len(rows)}
}
