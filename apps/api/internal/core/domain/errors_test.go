package domain

import (
	"errors"
	"testing"
)

func TestErrors(t *testing.T) {
	errs := []*Error{
		BadRequest("BAD_REQUEST"),
		Unauthorized("UNAUTHORIZED"),
		PaymentRequired("PAYMENT_REQUIRED"),
		Forbidden("FORBIDDEN"),
		NotFound("NOT_FOUND"),
		Conflict("CONFLICT"),
		TooManyRequests("TOO_MANY_REQUESTS"),
		Internal("INTERNAL"),
		ServiceUnavailable("SERVICE_UNAVAILABLE"),
	}

	for _, err := range errs {
		if err.Error() != err.Code {
			t.Errorf("Error() = %q, want %q", err.Error(), err.Code)
		}
		if !HasCode(err, err.Code) {
			t.Errorf("HasCode(%v, %q) = false, want true", err, err.Code)
		}
	}

	if HasCode(errors.New("other"), "CODE") {
		t.Error("HasCode on plain error should be false")
	}
	if HasCode(BadRequest("CODE1"), "CODE2") {
		t.Error("HasCode on wrong code should be false")
	}
}
