package domain

import (
	"encoding/json"
	"testing"
)

func TestShiftJSON(t *testing.T) {
	notes := "Mañana"
	tests := []struct {
		name  string
		shift Shift
		want  string
	}{
		{
			name: "without notes nor photo",
			shift: Shift{
				ID: "s1", StartTime: NewInstant(at("2026-09-27T08:00:00Z")), EndTime: NewInstant(at("2026-09-27T16:00:00Z")),
				UserID: "u1", UserName: "Ana", EstablishmentID: "e1",
			},
			want: `{"id":"s1","startTime":"2026-09-27T08:00:00Z","endTime":"2026-09-27T16:00:00Z","userId":"u1","userName":"Ana","establishmentId":"e1"}`,
		},
		{
			name: "with notes",
			shift: Shift{
				ID: "s1", StartTime: NewInstant(at("2026-09-27T08:00:00Z")), EndTime: NewInstant(at("2026-09-27T16:00:00Z")),
				UserID: "u1", UserName: "Ana", EstablishmentID: "e1", Notes: &notes,
			},
			want: `{"id":"s1","startTime":"2026-09-27T08:00:00Z","endTime":"2026-09-27T16:00:00Z","userId":"u1","userName":"Ana","establishmentId":"e1","notes":"Mañana"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.shift)
			if err != nil || string(got) != tt.want {
				t.Errorf("got  %s, %v\nwant %s", got, err, tt.want)
			}
		})
	}
}
