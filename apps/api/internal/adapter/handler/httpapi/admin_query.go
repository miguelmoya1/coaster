package httpapi

import (
	"math"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"coaster-api/internal/core/domain"
)

const adminMaxPageNumber = 1 << 53

type adminListQuery struct {
	values   url.Values
	messages []string
}

func newAdminListQuery(values url.Values, known ...string) *adminListQuery {
	return &adminListQuery{values: values, messages: unknownParams(values, known...)}
}
func (q *adminListQuery) value(name string) (string, bool) {
	values, ok := q.values[name]
	return strings.Join(values, ","), ok
}

func (q *adminListQuery) text(name string, maxLength int) string {
	value, _ := q.value(name)
	if utf8.RuneCountInString(value) > maxLength {
		q.messages = append(q.messages, domain.CodeMaxLength)
		return ""
	}
	return value
}

func (q *adminListQuery) oneOf(name string, allowed []string, code string) string {
	value, ok := q.value(name)
	if ok && !slices.Contains(allowed, value) {
		q.messages = append(q.messages, code)
		return ""
	}
	return value
}

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

func (q *adminListQuery) page() domain.PageRequest {
	page := q.integer("page", 0)
	pageSize := q.integer("pageSize", domain.MaxPageSize)
	return domain.NewPageRequest(page, pageSize)
}

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
