package http

import (
	"math"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"api-go/internal/core/domain"
)

// adminMaxPageNumber keeps a huge page number within what the offset can hold.
const adminMaxPageNumber = 1 << 53

// adminListQuery reads the query string of a backoffice list as Nest's ValidationPipe does
// with implicit conversion: unknown keys are refused, a repeated key is read as its values
// joined by commas (String of an array), numbers are read like Number(), and each field
// reports the first rule it fails. Read the fields in the order of the DTO, then call err.
type adminListQuery struct {
	values   url.Values
	messages []string
}

func newAdminListQuery(values url.Values, known ...string) *adminListQuery {
	var unknown []string
	for key := range values {
		if !slices.Contains(known, key) {
			unknown = append(unknown, key)
		}
	}
	slices.Sort(unknown)

	query := &adminListQuery{values: values}
	for _, key := range unknown {
		query.messages = append(query.messages, "property "+key+" should not exist")
	}
	return query
}

// value returns the field as Nest reads it, and whether the query has it at all.
func (q *adminListQuery) value(name string) (string, bool) {
	values, ok := q.values[name]
	return strings.Join(values, ","), ok
}

// text is an optional @IsString with @MaxLength.
func (q *adminListQuery) text(name string, maxLength int) string {
	value, _ := q.value(name)
	if utf8.RuneCountInString(value) > maxLength {
		q.messages = append(q.messages, domain.CodeMaxLength)
		return ""
	}
	return value
}

// oneOf is an optional @IsIn that answers code when the value is not allowed.
func (q *adminListQuery) oneOf(name string, allowed []string, code string) string {
	value, ok := q.value(name)
	if ok && !slices.Contains(allowed, value) {
		q.messages = append(q.messages, code)
		return ""
	}
	return value
}

// boolean is an optional "true" or "false".
func (q *adminListQuery) boolean(name string) *bool {
	value, ok := q.value(name)
	if !ok {
		return nil
	}

	switch value {
	case "true", "false":
		parsed := value == "true"
		return &parsed
	default:
		q.messages = append(q.messages, domain.CodeInvalidType)
		return nil
	}
}

// page reads page and pageSize: optional integers from 1, pageSize up to 100.
func (q *adminListQuery) page() domain.PageRequest {
	page := q.integer("page", 0)
	pageSize := q.integer("pageSize", domain.MaxPageSize)
	return domain.NewPageRequest(page, pageSize)
}

// integer is an optional @IsInt with @Min(1) and, when maxValue is not 0, @Max(maxValue).
func (q *adminListQuery) integer(name string, maxValue int) *int {
	value, ok := q.value(name)
	if !ok {
		return nil
	}

	number, isNumber := adminQueryNumber(value)
	switch {
	case !isNumber || number != math.Trunc(number):
		q.messages = append(q.messages, domain.CodeInvalidType)
		return nil
	case number < 1:
		q.messages = append(q.messages, domain.CodeMinLength)
		return nil
	case maxValue > 0 && number > float64(maxValue):
		q.messages = append(q.messages, domain.CodeMaxLength)
		return nil
	}

	integer := int(min(number, adminMaxPageNumber))
	return &integer
}

func (q *adminListQuery) err() error {
	if len(q.messages) > 0 {
		return validationFailed(q.messages)
	}
	return nil
}

// adminQueryNumber reads a value like JavaScript's Number(): surrounding spaces do not count
// and an empty value is 0. It reports false for what Number() turns into NaN or Infinity.
func adminQueryNumber(value string) (float64, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, true
	}

	number, err := strconv.ParseFloat(value, 64)
	if err != nil || math.IsNaN(number) || math.IsInf(number, 0) {
		return 0, false
	}
	return number, true
}
