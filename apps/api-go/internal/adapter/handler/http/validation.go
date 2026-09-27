package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
)

// validate checks request bodies. How to describe one is in «Convenciones de P0» of MIGRACION.md.
var validate = newValidator()

func newValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())

	v.RegisterTagNameFunc(func(field reflect.StructField) string {
		return jsonName(field)
	})

	if err := v.RegisterValidation("iso8601", isISO8601); err != nil {
		panic(err)
	}

	if err := v.RegisterValidation("oneofci", isOneOfIgnoringCase); err != nil {
		panic(err)
	}

	return v
}

// iso8601Pattern accepts the forms of ISO 8601 the web app sends: a date, or a date and time
// with optional seconds, fraction and offset.
var iso8601Pattern = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$`)

// isISO8601 is @IsISO8601({ strict: true }): the format, and a date that exists.
func isISO8601(fl validator.FieldLevel) bool {
	value := fl.Field().String()

	match := iso8601Pattern.FindStringSubmatch(value)
	if match == nil {
		return false
	}

	if _, err := time.Parse("2006-01-02", match[1]+"-"+match[2]+"-"+match[3]); err != nil {
		return false
	}

	if match[4] != "" {
		hour, _ := strconv.Atoi(match[4])
		minute, _ := strconv.Atoi(match[5])
		if hour > 23 || minute > 59 {
			return false
		}
	}

	if match[6] != "" {
		second, _ := strconv.Atoi(match[6])
		if second > 59 {
			return false
		}
	}

	return true
}

// isOneOfIgnoringCase is oneof for a value trimmed and in lower case first, like a DTO with
// @Transform(trim and toLowerCase) before its @IsIn. The allowed values go in lower case.
func isOneOfIgnoringCase(fl validator.FieldLevel) bool {
	value := strings.ToLower(strings.TrimSpace(fl.Field().String()))
	return slices.Contains(strings.Fields(fl.Param()), value)
}

// validateBody checks raw (the parsed body) against dst's struct, then fills dst and runs the
// validate rules. Unknown properties come first, as in Nest.
func validateBody(body []byte, raw any, dst any) error {
	structType := reflect.TypeOf(dst).Elem()

	object, ok := raw.(map[string]any)
	if !ok {
		return validationFailed([]string{"an unknown value was passed to the validate function"})
	}

	check := &bodyCheck{}
	check.object(structType, object, "")

	if len(check.wrongType) > 0 {
		return validationFailed(append(check.unknown, check.wrongType...))
	}

	if err := json.Unmarshal(body, dst); err != nil {
		return validationFailed(append(check.unknown, "the body does not match the expected types"))
	}

	messages := check.unknown

	if err := validate.Struct(dst); err != nil {
		var fieldErrors validator.ValidationErrors
		if !errors.As(err, &fieldErrors) {
			return err
		}

		for _, fieldError := range fieldErrors {
			messages = append(messages, ruleMessage(structType, fieldError))
		}
	}

	if len(messages) > 0 {
		return validationFailed(messages)
	}

	return nil
}

// bodyCheck walks the parsed body next to the struct and collects what class-validator would
// reject before looking at the rules: unknown properties, and values that are missing or of
// the wrong type.
type bodyCheck struct {
	unknown   []string
	wrongType []string
}

func (c *bodyCheck) object(structType reflect.Type, object map[string]any, prefix string) {
	fields := structFields(structType)

	var unknown []string
	for key := range object {
		if !slices.ContainsFunc(fields, func(f reflect.StructField) bool { return jsonName(f) == key }) {
			unknown = append(unknown, key)
		}
	}
	slices.Sort(unknown)

	for _, key := range unknown {
		c.unknown = append(c.unknown, prefix+"property "+key+" should not exist")
	}

	for _, field := range fields {
		name := jsonName(field)
		value, present := object[name]

		if !present || value == nil {
			if isOptional(field) {
				continue
			}

			if hasRule(field, "required") {
				c.wrongType = append(c.wrongType, prefix+message(field, "required", name+" should not be empty"))
			} else {
				c.wrongType = append(c.wrongType, prefix+message(field, "type", typeMessage(field.Type, name)))
			}
			continue
		}

		c.value(field, field.Type, value, name, prefix)
	}
}

func (c *bodyCheck) value(field reflect.StructField, fieldType reflect.Type, value any, name, prefix string) {
	for fieldType.Kind() == reflect.Pointer {
		fieldType = fieldType.Elem()
	}

	// Types that read their own JSON (domain.Time, for example) are left to json.Unmarshal.
	if reflect.PointerTo(fieldType).Implements(reflect.TypeFor[json.Unmarshaler]()) {
		return
	}

	switch fieldType.Kind() {
	case reflect.Struct:
		object, ok := value.(map[string]any)
		if !ok {
			c.wrongType = append(c.wrongType, prefix+message(field, "type", typeMessage(fieldType, name)))
			return
		}
		c.object(fieldType, object, prefix+name+".")

	case reflect.Slice:
		items, ok := value.([]any)
		if !ok {
			c.wrongType = append(c.wrongType, prefix+message(field, "type", typeMessage(fieldType, name)))
			return
		}

		elemType := fieldType.Elem()
		for elemType.Kind() == reflect.Pointer {
			elemType = elemType.Elem()
		}

		for i, item := range items {
			if elemType.Kind() == reflect.Struct {
				object, ok := item.(map[string]any)
				if !ok {
					c.wrongType = append(c.wrongType, prefix+message(field, "type", "nested property "+name+" must be either object or array"))
					continue
				}
				c.object(elemType, object, prefix+name+"."+strconv.Itoa(i)+".")
				continue
			}

			if !matchesKind(elemType, item) {
				c.wrongType = append(c.wrongType, prefix+message(field, "type", "each value in "+typeMessage(elemType, name)))
				return
			}
		}

	default:
		if !matchesKind(fieldType, value) {
			c.wrongType = append(c.wrongType, prefix+message(field, "type", typeMessage(fieldType, name)))
		}
	}
}

// matchesKind reports whether a parsed JSON value fits a Go type of a basic kind.
func matchesKind(goType reflect.Type, value any) bool {
	switch goType.Kind() {
	case reflect.String:
		_, ok := value.(string)
		return ok
	case reflect.Bool:
		_, ok := value.(bool)
		return ok
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		number, ok := value.(json.Number)
		if !ok {
			return false
		}
		_, err := strconv.ParseInt(number.String(), 10, 64)
		return err == nil
	case reflect.Float32, reflect.Float64:
		_, ok := value.(json.Number)
		return ok
	case reflect.Map, reflect.Interface:
		return true
	default:
		return false
	}
}

// typeMessage is class-validator's text for a value that is not of the field's type.
func typeMessage(goType reflect.Type, name string) string {
	for goType.Kind() == reflect.Pointer {
		goType = goType.Elem()
	}

	switch goType.Kind() {
	case reflect.String:
		return name + " must be a string"
	case reflect.Bool:
		return name + " must be a boolean value"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return name + " must be an integer number"
	case reflect.Float32, reflect.Float64:
		return name + " must be a number conforming to the specified constraints"
	case reflect.Slice:
		return name + " must be an array"
	case reflect.Map:
		return name + " must be an object"
	default:
		return "nested property " + name + " must be either object or array"
	}
}

// ruleMessage turns a failed validate rule into class-validator's text, with the path of
// the field in front when it is nested ("items.0.quantity must not be less than 1").
func ruleMessage(root reflect.Type, fieldError validator.FieldError) string {
	// Namespace is "Request.items[0].quantity"; the first part is the struct's name.
	namespace := fieldError.Namespace()
	if dot := strings.Index(namespace, "."); dot >= 0 {
		namespace = namespace[dot+1:]
	}

	parts := strings.Split(namespace, ".")
	last := parts[len(parts)-1]

	// A rule after "dive" fails on an element: "modules[1]".
	each := strings.HasSuffix(last, "]")
	name, _, _ := strings.Cut(last, "[")

	var prefix strings.Builder
	for _, part := range parts[:len(parts)-1] {
		base, index, hasIndex := strings.Cut(part, "[")
		prefix.WriteString(base + ".")
		if hasIndex {
			prefix.WriteString(strings.TrimSuffix(index, "]") + ".")
		}
	}

	field, found := findField(root, parts)
	text := defaultRuleMessage(fieldError, name, each)
	if found {
		text = message(field, fieldError.Tag(), text)
	}

	return prefix.String() + text
}

// findField follows the path of a namespace ("items[0]", "quantity") to its struct field.
func findField(root reflect.Type, parts []string) (reflect.StructField, bool) {
	current := root

	var field reflect.StructField
	for _, part := range parts {
		name, _, _ := strings.Cut(part, "[")

		for current.Kind() == reflect.Pointer || current.Kind() == reflect.Slice {
			current = current.Elem()
		}
		if current.Kind() != reflect.Struct {
			return reflect.StructField{}, false
		}

		index := slices.IndexFunc(structFields(current), func(f reflect.StructField) bool { return jsonName(f) == name })
		if index < 0 {
			return reflect.StructField{}, false
		}

		field = structFields(current)[index]
		current = field.Type
	}

	return field, true
}

// defaultRuleMessage is class-validator's default text for each rule.
func defaultRuleMessage(fieldError validator.FieldError, name string, each bool) string {
	subject := name
	if each {
		subject = "each value in " + name
	}

	param := fieldError.Param()
	kind := fieldError.Kind()
	if each {
		kind = fieldError.Type().Kind()
	}

	switch fieldError.Tag() {
	case "required":
		return subject + " should not be empty"
	case "min", "gte":
		switch kind {
		case reflect.String:
			return subject + " must be longer than or equal to " + param + " characters"
		case reflect.Slice:
			return subject + " must contain at least " + param + " elements"
		default:
			return subject + " must not be less than " + param
		}
	case "max", "lte":
		switch kind {
		case reflect.String:
			return subject + " must be shorter than or equal to " + param + " characters"
		case reflect.Slice:
			return subject + " must contain no more than " + param + " elements"
		default:
			return subject + " must not be greater than " + param
		}
	case "oneof":
		return subject + " must be one of the following values: " + strings.Join(strings.Fields(param), ", ")
	case "oneofci":
		return subject + " must be one of the following values: " + strings.Join(strings.Fields(param), ", ")
	case "email":
		return subject + " must be an email"
	case "uuid", "uuid4":
		return subject + " must be a UUID"
	case "latitude":
		return subject + " must be a latitude string or number"
	case "longitude":
		return subject + " must be a longitude string or number"
	case "ip":
		return subject + " must be an ip address"
	case "unique":
		return "All " + name + "'s elements must be unique"
	case "iso8601":
		return subject + " must be a valid ISO 8601 date string"
	default:
		return fmt.Sprintf("%s does not pass the %s rule", subject, fieldError.Tag())
	}
}

// message returns the text msg gives the rule, or fallback.
func message(field reflect.StructField, rule, fallback string) string {
	for entry := range strings.SplitSeq(field.Tag.Get("msg"), ",") {
		key, value, found := strings.Cut(entry, "=")
		if found && key == rule {
			return value
		}
	}
	return fallback
}

func hasRule(field reflect.StructField, rule string) bool {
	return slices.Contains(strings.Split(field.Tag.Get("validate"), ","), rule)
}

func isOptional(field reflect.StructField) bool {
	return hasRule(field, "omitnil") || hasRule(field, "omitempty")
}

// structFields lists the fields that appear in the JSON.
func structFields(structType reflect.Type) []reflect.StructField {
	var fields []reflect.StructField
	for field := range structType.Fields() {
		if field.IsExported() && jsonName(field) != "" {
			fields = append(fields, field)
		}
	}
	return fields
}

// jsonName is the name of the field in the JSON, or "" if it is not in it.
func jsonName(field reflect.StructField) string {
	name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
	if name == "-" {
		return ""
	}
	if name == "" {
		return field.Name
	}
	return name
}
