package updater_test

import (
	"testing"
	"printer-service/internal/updater"
)

func TestNewUpdater_DefaultFunctions(t *testing.T) {
	// This test simply verifies that NewUpdater configures the default functions without panicking
	u := updater.NewUpdater("http://example.com")
	
	if u.BackendURL != "http://example.com" {
		t.Errorf("expected backend URL to be set")
	}
	
	if u.ApplyUpdateFunc == nil || u.RestartFunc == nil || u.ExitFunc == nil {
		t.Errorf("expected default functions to be initialized")
	}

	// We can't easily execute ApplyUpdateFunc or RestartFunc in CI without side effects,
	// but we can test that they are assigned.
}
