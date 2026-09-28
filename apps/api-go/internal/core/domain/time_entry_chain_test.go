package domain

import (
	"testing"
	"time"
)

func chainRow(id string, sequence int64) TimeEntryRow {
	return TimeEntryRow{
		ID:              id,
		EstablishmentID: "establishment-1",
		UserID:          "user-1",
		RootID:          id,
		Type:            TimeEntryClockIn,
		Action:          TimeEntryRecordedAction,
		OccurredAt:      at("2026-08-08T07:00:00Z"),
		RecordedAt:      at("2026-08-08T07:00:00Z").Add(500 * time.Millisecond),
		WorkdayDate:     at("2026-08-08T00:00:00Z"),
		UserSnapshot:    TimeEntrySnapshot{Name: "Ana", Email: "ana@establishment.com"},
		Source:          TimeEntryFromEmployeeDevice,
		ActorID:         "user-1",
		Sequence:        sequence,
	}
}

func chainOf(rows ...TimeEntryRow) []TimeEntryRow {
	prevHash := GenesisHash
	for i := range rows {
		rows[i].PrevHash = prevHash
		rows[i].Hash = HashTimeEntry(ChainPayloadOf(rows[i]), prevHash)
		prevHash = rows[i].Hash
	}
	return rows
}

func TestHashTimeEntryMatchesNest(t *testing.T) {

	first := ChainPayloadOf(chainRow("entry-1", 1))
	if got := HashTimeEntry(first, GenesisHash); got != "e74657c444ba2516a7f865e0f9ed186e1560fae057324f24ac51bb3c0f98a4bc" {
		t.Errorf("first hash = %s", got)
	}

	supersedes := "entry-1"
	reason := "Olvidó fichar"
	amended := ChainPayload{
		ID:              "entry-2",
		EstablishmentID: "establishment-1",
		UserID:          "user-1",
		RootID:          "entry-1",
		Type:            TimeEntryClockIn,
		Action:          TimeEntryAmendedAction,
		OccurredAt:      at("2026-08-08T08:30:00+02:00"),
		RecordedAt:      at("2026-08-08T09:00:00Z"),
		WorkdayDate:     at("2026-08-08T00:00:00Z"),
		UserSnapshot:    TimeEntrySnapshot{Name: "Ana Peña", Email: "ana@establishment.com"},
		Source:          TimeEntryFromEmployeeDevice,
		SupersedesID:    &supersedes,
		ActorID:         "admin-1",
		Reason:          &reason,
		Sequence:        2,
	}
	if got := HashTimeEntry(amended, "abc"); got != "9c002719f43abc08268c0599467f6d46a850fbc7e10e8c31aaa0a1da3d15cdf8" {
		t.Errorf("amended hash = %s", got)
	}
}

func TestHashTimeEntryChangesWithTheContent(t *testing.T) {
	row := chainRow("entry-1", 1)
	moved := row
	moved.OccurredAt = at("2026-08-08T07:01:00Z")

	if HashTimeEntry(ChainPayloadOf(row), GenesisHash) != HashTimeEntry(ChainPayloadOf(row), GenesisHash) {
		t.Error("the same payload must hash the same")
	}
	if HashTimeEntry(ChainPayloadOf(moved), GenesisHash) == HashTimeEntry(ChainPayloadOf(row), GenesisHash) {
		t.Error("a minute moved must change the hash")
	}
}

func TestVerifyChain(t *testing.T) {
	tests := []struct {
		name   string
		chain  func() []TimeEntryRow
		valid  bool
		broken string
	}{
		{"built link by link", func() []TimeEntryRow {
			return chainOf(chainRow("entry-1", 1), chainRow("entry-2", 2))
		}, true, ""},
		{"an hour edited", func() []TimeEntryRow {
			chain := chainOf(chainRow("entry-1", 1), chainRow("entry-2", 2))
			chain[0].OccurredAt = at("2026-08-08T06:00:00Z")
			return chain
		}, false, "entry-1"},
		{"moved to another workday", func() []TimeEntryRow {
			chain := chainOf(chainRow("entry-1", 1))
			chain[0].WorkdayDate = at("2026-08-07T00:00:00Z")
			return chain
		}, false, "entry-1"},
		{"reassigned to somebody else", func() []TimeEntryRow {
			chain := chainOf(chainRow("entry-1", 1))
			chain[0].UserSnapshot = TimeEntrySnapshot{Name: "Luis", Email: "luis@establishment.com"}
			return chain
		}, false, "entry-1"},
		{"a row deleted from the middle", func() []TimeEntryRow {
			chain := chainOf(chainRow("entry-1", 1), chainRow("entry-2", 2), chainRow("entry-3", 3))
			return []TimeEntryRow{chain[0], chain[2]}
		}, false, "entry-3"},
		{"empty", func() []TimeEntryRow { return nil }, true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			chain := tt.chain()
			got := VerifyChain(chain)

			if got.Valid != tt.valid || got.Checked != len(chain) {
				t.Fatalf("got %+v", got)
			}
			if tt.broken == "" && got.BrokenAt != nil {
				t.Fatalf("broken at %s, want intact", *got.BrokenAt)
			}
			if tt.broken != "" && (got.BrokenAt == nil || *got.BrokenAt != tt.broken) {
				t.Fatalf("broken at %v, want %s", got.BrokenAt, tt.broken)
			}
		})
	}
}
