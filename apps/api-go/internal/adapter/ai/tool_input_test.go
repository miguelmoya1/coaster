package ai

import (
	"encoding/json"
	"strings"
	"testing"

	"api-go/internal/core/ports"
)

// orderTool has the schema zod gives z.object({ e: z.enum(['CASH', 'CARD']), b: z.boolean(),
// q: z.number().int().min(1), big: z.number().int(), items: z.array(z.object({ p: z.string() })).min(2),
// price: z.number().min(0), o: z.string().optional() }).
var orderTool = ports.AITool{
	Name: "order",
	Parameters: json.RawMessage(`{
		"type": "object",
		"properties": {
			"e": {"type": "string", "enum": ["CASH", "CARD"]},
			"b": {"type": "boolean"},
			"q": {"type": "integer", "minimum": 1, "maximum": 9007199254740991},
			"big": {"type": "integer", "minimum": -9007199254740991, "maximum": 9007199254740991},
			"items": {"minItems": 2, "type": "array", "items": {"type": "object", "properties": {"p": {"type": "string"}}, "required": ["p"], "additionalProperties": false}},
			"price": {"type": "number", "minimum": 0},
			"o": {"type": "string"}
		},
		"required": ["e", "b", "q", "big", "items", "price"],
		"additionalProperties": false
	}`),
}

// zodIssues is the Error message part of what parseToolInput answers, decoded again.
func zodIssues(t *testing.T, err error) string {
	t.Helper()
	if err == nil {
		t.Fatal("the input was accepted")
	}
	_, issues, found := strings.Cut(err.Error(), "Error message: ")
	if !found {
		t.Fatalf("no issues in %q", err)
	}

	var decoded []map[string]any
	if err := json.Unmarshal([]byte(issues), &decoded); err != nil {
		t.Fatalf("the issues are not JSON: %s", issues)
	}
	return mustJSON(t, decoded)
}

func TestParseToolInputReportsWhatZodReports(t *testing.T) {
	tests := []struct {
		name  string
		input string
		// want is what zod 4 gives for the same input, with the keys sorted. Two things are
		// left out: the "note" of an integer outside the safe range, and the too_small zod
		// adds for a string sent as an array that is shorter than minItems.
		want string
	}{
		{
			name:  "missing, not an integer and too few items",
			input: `{"q": 0.5, "big": 2, "items": [5], "price": 1, "o": null, "extra": 1}`,
			want: `[{"code":"invalid_value","message":"Invalid option: expected one of \"CASH\"|\"CARD\"","path":["e"],"values":["CASH","CARD"]},` +
				`{"code":"invalid_type","expected":"boolean","message":"Invalid input: expected boolean, received undefined","path":["b"]},` +
				`{"code":"invalid_type","expected":"int","format":"safeint","message":"Invalid input: expected int, received number","path":["q"]},` +
				`{"code":"invalid_type","expected":"object","message":"Invalid input: expected object, received number","path":["items",0]},` +
				`{"code":"too_small","inclusive":true,"message":"Too small: expected array to have >=2 items","minimum":2,"origin":"array","path":["items"]},` +
				`{"code":"invalid_type","expected":"string","message":"Invalid input: expected string, received null","path":["o"]}]`,
		},
		{
			name:  "wrong types",
			input: `{"e": 5, "b": "x", "q": "1", "big": 2, "items": "x", "price": 1}`,
			want: `[{"code":"invalid_value","message":"Invalid option: expected one of \"CASH\"|\"CARD\"","path":["e"],"values":["CASH","CARD"]},` +
				`{"code":"invalid_type","expected":"boolean","message":"Invalid input: expected boolean, received string","path":["b"]},` +
				`{"code":"invalid_type","expected":"number","message":"Invalid input: expected number, received string","path":["q"]},` +
				`{"code":"invalid_type","expected":"array","message":"Invalid input: expected array, received string","path":["items"]}]`,
		},
		{
			name:  "below the minimum",
			input: `{"e": "CASH", "b": true, "q": 0, "big": 2, "items": [{"p": "a"}, {"p": "b"}], "price": -0.5}`,
			want: `[{"code":"too_small","inclusive":true,"message":"Too small: expected number to be >=1","minimum":1,"origin":"number","path":["q"]},` +
				`{"code":"too_small","inclusive":true,"message":"Too small: expected number to be >=0","minimum":0,"origin":"number","path":["price"]}]`,
		},
		{
			name:  "outside the safe integers",
			input: `{"e": "CASH", "b": true, "q": 1, "big": 1e300, "items": [{"p": "a"}, {"p": "b"}], "price": 0}`,
			want:  `[{"code":"too_big","inclusive":true,"maximum":9007199254740991,"message":"Too big: expected int to be <=9007199254740991","origin":"int","path":["big"]}]`,
		},
		{
			name:  "not an object",
			input: `[1]`,
			want:  `[{"code":"invalid_type","expected":"object","message":"Invalid input: expected object, received array","path":[]}]`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := parseToolInput(orderTool, test.input)
			if got := zodIssues(t, err); got != test.want {
				t.Errorf("issues =\n%s\nwant\n%s", got, test.want)
			}
		})
	}
}

func TestParseToolInputWritesTheInputBackAsJSON(t *testing.T) {
	input, err := parseToolInput(orderTool, `{"e": "CARD", "b": false, "q": 2.0, "big": -3, "items": [{"p": "a", "x": 1}, {"p": "b"}], "price": 2.5, "extra": "stays"}`)
	if err != nil {
		t.Fatal(err)
	}

	want := `{"b":false,"big":-3,"e":"CARD","extra":"stays","items":[{"p":"a","x":1},{"p":"b"}],"price":2.5,"q":2}`
	if string(input) != want {
		t.Errorf("input = %s, want %s", input, want)
	}
}

func TestParseToolInputQuotesTheValueItWasGiven(t *testing.T) {
	_, err := parseToolInput(orderTool, "{\n  \"e\": \"CASH\",\n  \"b\": 1\n}")

	if err == nil || !strings.HasPrefix(err.Error(), `Invalid input for tool order: Type validation failed: Value: {"e":"CASH","b":1}.`+"\nError message: [\n  {\n") {
		t.Errorf("error = %v", err)
	}
}
