package http

import (
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

type testItem struct {
	ProductID string `json:"productId" validate:"required,uuid"`
	Quantity  int    `json:"quantity" validate:"min=1"`
}

type testOrderRequest struct {
	Name     string        `json:"name" validate:"required,min=3,max=5" msg:"required=REQUIRED,min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
	Note     *string       `json:"note" validate:"omitnil,max=4"`
	Count    int           `json:"count" validate:"min=0,max=10"`
	Price    float64       `json:"price"`
	Paid     bool          `json:"paid"`
	Status   string        `json:"status" validate:"oneof=OPEN CLOSED"`
	Modules  []string      `json:"modules" validate:"unique,dive,oneof=ORDERS SHIFTS"`
	Items    []testItem    `json:"items" validate:"min=1,dive"`
	At       *string       `json:"at" validate:"omitnil,iso8601" msg:"iso8601=INVALID_DATE"`
	OpenedAt *domain.Time  `json:"openedAt" validate:"omitnil"`
	Extra    *testItem     `json:"extra" validate:"omitnil"`
	Tags     []string      `json:"tags" validate:"omitnil,max=2"`
	Settings *testSettings `json:"settings" validate:"omitnil"`
}

type testSettings struct {
	Language string `json:"language" validate:"oneof=es en"`
}

const validOrder = `"name":"Bar","count":1,"price":1.5,"paid":true,"status":"OPEN","modules":["ORDERS"],"items":[{"productId":"8b1c3f36-2f6e-4a3c-9d3a-0f1a5c9e7b21","quantity":1}]`

func TestValidationMessages(t *testing.T) {
	tests := []struct {
		name string
		body string
		want []string
	}{
		{name: "valid", body: `{` + validOrder + `}`},
		{name: "valid with optional fields", body: `{` + validOrder + `,"note":"hey","at":"2026-09-27T10:00:00.000Z","openedAt":"2026-09-27T10:00:00.000Z","settings":{"language":"es"}}`},
		{name: "null optional field", body: `{` + validOrder + `,"note":null}`},
		{
			name: "unknown properties first, sorted",
			body: `{` + validOrder + `,"zeta":1,"alpha":2,"count":20}`,
			want: []string{"property alpha should not exist", "property zeta should not exist", "count must not be greater than 10"},
		},
		{
			name: "missing required field with a custom message",
			body: `{"count":1,"price":1,"paid":true,"status":"OPEN","modules":[],"items":[{"productId":"8b1c3f36-2f6e-4a3c-9d3a-0f1a5c9e7b21","quantity":1}]}`,
			want: []string{"REQUIRED"},
		},
		{
			name: "missing field without required gets the type message",
			body: `{"name":"Bar","price":1,"paid":true,"status":"OPEN","modules":[],"items":[{"productId":"8b1c3f36-2f6e-4a3c-9d3a-0f1a5c9e7b21","quantity":1}]}`,
			want: []string{"count must be an integer number"},
		},
		{
			name: "wrong types",
			body: `{"name":5,"count":1.5,"price":"1","paid":"yes","status":"OPEN","modules":"ORDERS","items":{},"extra":[]}`,
			want: []string{
				"INVALID_TYPE",
				"count must be an integer number",
				"price must be a number conforming to the specified constraints",
				"paid must be a boolean value",
				"modules must be an array",
				"items must be an array",
				"nested property extra must be either object or array",
			},
		},
		{
			name: "each value of the wrong type",
			body: `{` + validOrder + `,"tags":["a",1]}`,
			want: []string{"each value in tags must be a string"},
		},
		{
			name: "string length with custom messages",
			body: `{` + strings.Replace(validOrder, `"name":"Bar"`, `"name":"Barcelona"`, 1) + `}`,
			want: []string{"MAX_LENGTH"},
		},
		{
			name: "default texts",
			body: `{` + validOrder + `,"note":"too long","tags":["a","b","c"]}`,
			want: []string{"note must be shorter than or equal to 4 characters", "tags must contain no more than 2 elements"},
		},
		{
			name: "oneof and unique; only the first rule that fails in each field",
			body: `{` + strings.Replace(strings.Replace(validOrder, `"OPEN"`, `"LOST"`, 1), `["ORDERS"]`, `["ORDERS","ORDERS","NOPE"]`, 1) + `}`,
			want: []string{
				"status must be one of the following values: OPEN, CLOSED",
				"All modules's elements must be unique",
			},
		},
		{
			name: "each value",
			body: `{` + strings.Replace(validOrder, `["ORDERS"]`, `["ORDERS","NOPE"]`, 1) + `}`,
			want: []string{"each value in modules must be one of the following values: ORDERS, SHIFTS"},
		},
		{
			name: "nested fields carry their path",
			body: `{` + strings.Replace(validOrder, `"quantity":1}]`, `"quantity":0},{"productId":"nope","quantity":1,"x":1}]`, 1) + `}`,
			want: []string{
				"items.1.property x should not exist",
				"items.0.quantity must not be less than 1",
				"items.1.productId must be a UUID",
			},
		},
		{
			name: "nested object",
			body: `{` + validOrder + `,"settings":{"language":"fr"}}`,
			want: []string{"settings.language must be one of the following values: es, en"},
		},
		{
			name: "empty slice",
			body: `{` + strings.Replace(validOrder, `"items":[{"productId":"8b1c3f36-2f6e-4a3c-9d3a-0f1a5c9e7b21","quantity":1}]`, `"items":[]`, 1) + `}`,
			want: []string{"items must contain at least 1 elements"},
		},
		{
			name: "ISO 8601 with a custom message",
			body: `{` + validOrder + `,"at":"2026-02-30T10:00:00Z"}`,
			want: []string{"INVALID_DATE"},
		},
		{
			name: "body that is not an object",
			body: `[1,2]`,
			want: []string{"an unknown value was passed to the validate function"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")

			var input testOrderRequest
			err := decodeJSON(req, &input)

			if tt.want == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}

			reqErr, ok := err.(*requestError)
			if !ok {
				t.Fatalf("got %v, want a validation error", err)
			}
			if !slices.Equal(reqErr.validation, tt.want) {
				t.Errorf("got  %q\nwant %q", reqErr.validation, tt.want)
			}
		})
	}
}

func TestISO8601(t *testing.T) {
	type request struct {
		At string `json:"at" validate:"iso8601"`
	}

	tests := map[string]bool{
		"2026-09-27":                   true,
		"2026-09-27T10:00":             true,
		"2026-09-27T10:00:00Z":         true,
		"2026-09-27T10:00:00.123Z":     true,
		"2026-09-27T10:00:00+02:00":    true,
		"2026-09-27 10:00:00":          true,
		"2026-13-01":                   false,
		"2026-02-29":                   false,
		"2026-09-27T25:00:00Z":         false,
		"27/09/2026":                   false,
		"":                             false,
		"2026-09-27T10:00:00.123Zjunk": false,
	}

	for value, want := range tests {
		t.Run(value, func(t *testing.T) {
			err := validate.Struct(request{At: value})
			if got := err == nil; got != want {
				t.Errorf("valid = %v, want %v (%v)", got, want, err)
			}
		})
	}
}

func TestBodyWithoutContentType(t *testing.T) {
	type request struct {
		Note *string `json:"note" validate:"omitnil"`
	}

	req := httptest.NewRequest("POST", "/", nil)

	var input request
	if err := decodeJSON(req, &input); err != nil {
		t.Errorf("an empty body without Content-Type should read as {}: %v", err)
	}
}

func TestBodyTooLarge(t *testing.T) {
	req := httptest.NewRequest("POST", "/", strings.NewReader(`{"note":"`+strings.Repeat("a", maxBodyBytes)+`"}`))
	req.Header.Set("Content-Type", "application/json")

	var input struct {
		Note string `json:"note"`
	}
	err := decodeJSON(req, &input)

	reqErr, ok := err.(*requestError)
	if !ok || reqErr.status != 413 || reqErr.message != "Request body is too large" {
		t.Errorf("got %#v, want a 413", err)
	}
}
