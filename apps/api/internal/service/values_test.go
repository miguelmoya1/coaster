package service

import "testing"

func TestTrimmedOrNil(t *testing.T) {
	if got := trimmedOrNil(new("  Bar Pepe ")); got == nil || *got != "Bar Pepe" {
		t.Errorf("trimmedOrNil(padded) = %v", got)
	}
	if got := trimmedOrNil(new("   ")); got != nil {
		t.Errorf("trimmedOrNil(blank) = %q", *got)
	}
	if got := trimmedOrNil(nil); got != nil {
		t.Errorf("trimmedOrNil(nil) = %q", *got)
	}
}
