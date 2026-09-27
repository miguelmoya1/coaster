package ai

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"

	"api-go/internal/core/ports"
)

// maxSafeInteger is Number.MAX_SAFE_INTEGER: zod's int() only takes integers up to here.
const maxSafeInteger = 1<<53 - 1

// parseToolInput checks what the model sent to a tool the way the AI SDK does before
// calling it: an empty text is {}, anything else has to be JSON that zod accepts for the
// tool's schema. It returns the input written back as JSON, so 2.0 reaches an int as 2.
// Properties the schema does not know are left in and the tool ignores them, as zod
// strips them. The error text is the one the AI SDK gives the model.
func parseToolInput(tool ports.AITool, arguments string) (json.RawMessage, error) {
	var value any
	if strings.TrimSpace(arguments) == "" {
		value = map[string]any{}
	} else if err := json.Unmarshal([]byte(arguments), &value); err != nil {
		return nil, fmt.Errorf("Invalid input for tool %s: JSON parsing failed: Text: %s.\nError message: %v", tool.Name, arguments, err)
	}

	var schema toolSchema
	if err := json.Unmarshal(tool.Parameters, &schema); err != nil {
		return nil, fmt.Errorf("reading the schema of %s: %w", tool.Name, err)
	}

	if issues := schema.check(value, []any{}); len(issues) > 0 {
		return nil, fmt.Errorf("Invalid input for tool %s: Type validation failed: Value: %s.\nError message: %s",
			tool.Name, compactJSON(arguments), issuesText(issues))
	}

	return marshal(value)
}

// toolSchema is the part of JSON Schema the tools use.
type toolSchema struct {
	Type       string           `json:"type"`
	Properties schemaProperties `json:"properties"`
	Required   []string         `json:"required"`
	Items      *toolSchema      `json:"items"`
	Enum       []string         `json:"enum"`
	Minimum    *float64         `json:"minimum"`
	Maximum    *float64         `json:"maximum"`
	MinItems   *int             `json:"minItems"`
}

// schemaProperties keeps the properties in the order the schema lists them, which is the
// order zod reports its issues in.
type schemaProperties struct {
	names  []string
	byName map[string]*toolSchema
}

func (p *schemaProperties) UnmarshalJSON(data []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	if _, err := decoder.Token(); err != nil {
		return err
	}

	p.byName = map[string]*toolSchema{}
	for decoder.More() {
		token, err := decoder.Token()
		if err != nil {
			return err
		}
		name, ok := token.(string)
		if !ok {
			return errors.New("a property name is not a string")
		}

		var property toolSchema
		if err := decoder.Decode(&property); err != nil {
			return err
		}
		p.names = append(p.names, name)
		p.byName[name] = &property
	}
	return nil
}

// zodIssue is an issue of a ZodError. The fields that do not apply stay out.
type zodIssue struct {
	Origin    string   `json:"origin,omitempty"`
	Expected  string   `json:"expected,omitempty"`
	Format    string   `json:"format,omitempty"`
	Code      string   `json:"code"`
	Values    []string `json:"values,omitempty"`
	Minimum   *float64 `json:"minimum,omitempty"`
	Maximum   *float64 `json:"maximum,omitempty"`
	Inclusive bool     `json:"inclusive,omitempty"`
	Path      []any    `json:"path"`
	Message   string   `json:"message"`
}

// check lists what zod would reject in value, a value decoded by encoding/json.
func (s *toolSchema) check(value any, path []any) []zodIssue {
	if s.Enum != nil {
		text, ok := value.(string)
		if !ok || !slices.Contains(s.Enum, text) {
			quoted := make([]string, 0, len(s.Enum))
			for _, option := range s.Enum {
				quoted = append(quoted, strconv.Quote(option))
			}
			return []zodIssue{{
				Code: "invalid_value", Values: s.Enum, Path: path,
				Message: "Invalid option: expected one of " + strings.Join(quoted, "|"),
			}}
		}
		return nil
	}

	switch s.Type {
	case "object":
		return s.checkObject(value, path)
	case "array":
		return s.checkArray(value, path)
	case "number", "integer":
		return s.checkNumber(value, path)
	case "string":
		if _, ok := value.(string); !ok {
			return []zodIssue{invalidType("string", value, path)}
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return []zodIssue{invalidType("boolean", value, path)}
		}
	}
	return nil
}

func (s *toolSchema) checkObject(value any, path []any) []zodIssue {
	object, ok := value.(map[string]any)
	if !ok {
		return []zodIssue{invalidType("object", value, path)}
	}

	var issues []zodIssue
	for _, name := range s.Properties.names {
		property, present := object[name]
		if !present {
			if slices.Contains(s.Required, name) {
				issues = append(issues, s.Properties.byName[name].missing(withKey(path, name))...)
			}
			continue
		}
		issues = append(issues, s.Properties.byName[name].check(property, withKey(path, name))...)
	}
	return issues
}

// missing is the issue of a required property that is not there.
func (s *toolSchema) missing(path []any) []zodIssue {
	if s.Enum != nil {
		return s.check(nil, path)
	}

	expected := s.Type
	if expected == "integer" {
		expected = "number"
	}
	return []zodIssue{{Expected: expected, Code: "invalid_type", Path: path, Message: "Invalid input: expected " + expected + ", received undefined"}}
}

func (s *toolSchema) checkArray(value any, path []any) []zodIssue {
	items, ok := value.([]any)
	if !ok {
		return []zodIssue{invalidType("array", value, path)}
	}

	var issues []zodIssue
	if s.Items != nil {
		for i, item := range items {
			issues = append(issues, s.Items.check(item, withKey(path, i))...)
		}
	}

	if s.MinItems != nil && len(items) < *s.MinItems {
		minimum := float64(*s.MinItems)
		issues = append(issues, zodIssue{
			Origin: "array", Code: "too_small", Minimum: &minimum, Inclusive: true, Path: path,
			Message: "Too small: expected array to have >=" + strconv.Itoa(*s.MinItems) + " items",
		})
	}
	return issues
}

func (s *toolSchema) checkNumber(value any, path []any) []zodIssue {
	number, ok := value.(float64)
	if !ok {
		return []zodIssue{invalidType("number", value, path)}
	}

	if s.Type == "integer" {
		if number != math.Trunc(number) {
			return []zodIssue{{Expected: "int", Format: "safeint", Code: "invalid_type", Path: path, Message: "Invalid input: expected int, received number"}}
		}
		if number > maxSafeInteger {
			maximum := float64(maxSafeInteger)
			return []zodIssue{{Origin: "int", Code: "too_big", Maximum: &maximum, Inclusive: true, Path: path, Message: "Too big: expected int to be <=" + formatNumber(maximum)}}
		}
		if number < -maxSafeInteger {
			minimum := float64(-maxSafeInteger)
			return []zodIssue{{Origin: "int", Code: "too_small", Minimum: &minimum, Inclusive: true, Path: path, Message: "Too small: expected int to be >=" + formatNumber(minimum)}}
		}
	}

	var issues []zodIssue
	if s.Minimum != nil && number < *s.Minimum {
		issues = append(issues, zodIssue{
			Origin: "number", Code: "too_small", Minimum: s.Minimum, Inclusive: true, Path: path,
			Message: "Too small: expected number to be >=" + formatNumber(*s.Minimum),
		})
	}
	if s.Maximum != nil && number > *s.Maximum {
		issues = append(issues, zodIssue{
			Origin: "number", Code: "too_big", Maximum: s.Maximum, Inclusive: true, Path: path,
			Message: "Too big: expected number to be <=" + formatNumber(*s.Maximum),
		})
	}
	return issues
}

func invalidType(expected string, value any, path []any) zodIssue {
	return zodIssue{Expected: expected, Code: "invalid_type", Path: path, Message: "Invalid input: expected " + expected + ", received " + typeOf(value)}
}

// typeOf names the type of a decoded JSON value as zod does.
func typeOf(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case string:
		return "string"
	case float64:
		return "number"
	case bool:
		return "boolean"
	case []any:
		return "array"
	default:
		return "object"
	}
}

// withKey is path with one more key, in a new slice: the paths of sibling issues must not
// share their backing array.
func withKey(path []any, key any) []any {
	return append(append([]any{}, path...), key)
}

func formatNumber(number float64) string {
	return strconv.FormatFloat(number, 'f', -1, 64)
}

// issuesText writes the issues as a ZodError's message: JSON indented with two spaces.
func issuesText(issues []zodIssue) string {
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(issues); err != nil {
		return err.Error()
	}
	return strings.TrimSuffix(buf.String(), "\n")
}

// compactJSON is the input as JSON.stringify writes it back; it is valid JSON by now.
func compactJSON(text string) string {
	var buf bytes.Buffer
	if err := json.Compact(&buf, []byte(text)); err != nil || buf.Len() == 0 {
		return "{}"
	}
	return buf.String()
}
