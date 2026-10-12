package e2e

import (
	"reflect"
	"testing"
)

func expectFields(t *testing.T, label string, got, want map[string]any) {
	t.Helper()

	for key, value := range want {
		if !reflect.DeepEqual(got[key], jsonValue(value)) {
			t.Errorf("%s.%s = %#v, want %#v", label, key, got[key], value)
		}
	}
}

func expectExactly(t *testing.T, label string, got, want map[string]any) {
	t.Helper()

	expectFields(t, label, got, want)
	for key := range got {
		if _, ok := want[key]; !ok {
			t.Errorf("%s has %s = %#v, which is not expected", label, key, got[key])
		}
	}
}

func jsonValue(value any) any {
	switch number := value.(type) {
	case int:
		return float64(number)
	case int64:
		return float64(number)
	default:
		return value
	}
}
