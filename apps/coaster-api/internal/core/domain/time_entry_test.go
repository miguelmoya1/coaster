package domain

import (
	"encoding/json"
	"testing"
)

func revisionRow(id, rootID string, sequence int64, action TimeEntryAction, occurredAt string) TimeEntryRow {
	return TimeEntryRow{
		ID:              id,
		EstablishmentID: "establishment-1",
		UserID:          "user-1",
		UserName:        "Ana",
		RootID:          rootID,
		Type:            TimeEntryClockIn,
		Action:          action,
		OccurredAt:      at(occurredAt),
		RecordedAt:      at(occurredAt),
		WorkdayDate:     at("2026-08-08T00:00:00Z"),
		Source:          TimeEntryFromEmployeeDevice,
		ActorID:         "user-1",
		Sequence:        sequence,
		Hash:            "hash-" + id,
	}
}

func TestToTimeEntry(t *testing.T) {
	latitude := 40.4
	original := revisionRow("entry-1", "entry-1", 1, TimeEntryRecordedAction, "2026-08-08T08:00:00Z")
	original.Latitude = &latitude
	amended := revisionRow("entry-2", "entry-1", 5, TimeEntryAmendedAction, "2026-08-08T07:00:00Z")

	entry := ToTimeEntry([]TimeEntryRow{amended, original})

	if entry.ID != "entry-2" || entry.RootID != "entry-1" || !entry.Amended || entry.Voided {
		t.Fatalf("entry = %+v", entry)
	}
	if !entry.OccurredAt.Equal(at("2026-08-08T07:00:00Z")) || entry.WorkdayDate != "2026-08-08" {
		t.Fatalf("the head's values: %+v", entry)
	}
	if entry.Latitude == nil || *entry.Latitude != latitude {
		t.Fatalf("the location comes from the original punch: %v", entry.Latitude)
	}
	if len(entry.Revisions) != 2 || entry.Revisions[0].ID != "entry-1" || entry.Revisions[1].ID != "entry-2" {
		t.Fatalf("revisions = %+v", entry.Revisions)
	}

	voided := ToTimeEntry([]TimeEntryRow{original, revisionRow("entry-3", "entry-1", 2, TimeEntryVoidedAction, "2026-08-08T08:00:00Z")})
	if !voided.Voided {
		t.Fatal("a punch whose last revision voids it is voided")
	}
}

func TestTimeEntryJSON(t *testing.T) {
	entry := ToTimeEntry([]TimeEntryRow{revisionRow("entry-1", "entry-1", 1, TimeEntryRecordedAction, "2026-08-08T08:00:00Z")})

	got, err := json.Marshal(entry)
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"entry-1","rootId":"entry-1","establishmentId":"establishment-1","userId":"user-1","userName":"Ana",` +
		`"type":"CLOCK_IN","occurredAt":"2026-08-08T08:00:00.000Z","recordedAt":"2026-08-08T08:00:00.000Z",` +
		`"workdayDate":"2026-08-08","source":"EMPLOYEE_DEVICE","amended":false,"voided":false,"revisions":[` +
		`{"id":"entry-1","action":"RECORDED","type":"CLOCK_IN","occurredAt":"2026-08-08T08:00:00.000Z",` +
		`"recordedAt":"2026-08-08T08:00:00.000Z","source":"EMPLOYEE_DEVICE","actorId":"user-1","actorName":null,` +
		`"reason":null,"hash":"hash-entry-1"}]}`
	if string(got) != want {
		t.Errorf("got  %s\nwant %s", got, want)
	}
}

func TestGroupByRoot(t *testing.T) {
	rows := []TimeEntryRow{
		revisionRow("out", "out", 1, TimeEntryRecordedAction, "2026-08-08T16:00:00Z"),
		revisionRow("in", "in", 2, TimeEntryRecordedAction, "2026-08-08T09:00:00Z"),
		revisionRow("in-fixed", "in", 3, TimeEntryAmendedAction, "2026-08-08T08:00:00Z"),
	}

	entries := GroupByRoot(rows)

	if len(entries) != 2 || entries[0].RootID != "in" || entries[1].RootID != "out" {
		t.Fatalf("entries = %+v", entries)
	}
	if entries[0].ID != "in-fixed" || len(entries[0].Revisions) != 2 {
		t.Fatalf("the corrected punch = %+v", entries[0])
	}
}
