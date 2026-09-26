package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestTimeMarshalsLikeJavaScript(t *testing.T) {
	madrid := time.FixedZone("CEST", 2*60*60)

	tests := []struct {
		name string
		in   time.Time
		want string
	}{
		{"whole second", time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC), `"2026-09-27T10:00:00.000Z"`},
		{"milliseconds", time.Date(2026, 9, 27, 10, 0, 0, 120_000_000, time.UTC), `"2026-09-27T10:00:00.120Z"`},
		{"drops microseconds", time.Date(2026, 9, 27, 10, 0, 0, 123_456_789, time.UTC), `"2026-09-27T10:00:00.123Z"`},
		{"other zone becomes UTC", time.Date(2026, 9, 27, 12, 0, 0, 0, madrid), `"2026-09-27T10:00:00.000Z"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(NewTime(tt.in))
			if err != nil {
				t.Fatal(err)
			}
			if string(got) != tt.want {
				t.Errorf("got %s, want %s", got, tt.want)
			}
		})
	}
}

func TestTimeUnmarshal(t *testing.T) {
	var got Time
	if err := json.Unmarshal([]byte(`"2026-09-27T10:00:00.120Z"`), &got); err != nil {
		t.Fatal(err)
	}

	want := time.Date(2026, 9, 27, 10, 0, 0, 120_000_000, time.UTC)
	if !got.Equal(want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
