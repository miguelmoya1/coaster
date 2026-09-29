package domain

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"
)

const realtimeEventsPath = "../../../../../apps/web/src/app/core/models/realtime-events.type.ts"

func TestRealtimeEventsMatchTheWeb(t *testing.T) {
	source, err := os.ReadFile(realtimeEventsPath)
	if err != nil {
		t.Fatalf("reading %s: %v", realtimeEventsPath, err)
	}

	_, constant, found := strings.Cut(string(source), "export const RealtimeEvents = {")
	if !found {
		t.Fatal("RealtimeEvents not found in realtime-events.type.ts")
	}

	entry := regexp.MustCompile(`(?m)^\s+(\w+): '(\w+)',`)

	var want []string
	for _, match := range entry.FindAllStringSubmatch(constant, -1) {
		want = append(want, match[2])
	}

	if !slices.Equal(AllRealtimeEvents, want) {
		t.Errorf("AllRealtimeEvents = %q\nwant %q", AllRealtimeEvents, want)
	}
}
