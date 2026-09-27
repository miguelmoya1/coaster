package domain

import "slices"

// Languages are the languages the app speaks, the same as LANGUAGES in @coaster/common.
var Languages = []string{"es", "en"}

// IsLanguage reports whether value is one of Languages.
func IsLanguage(value string) bool {
	return slices.Contains(Languages, value)
}

// AsLanguage returns value when it is a language, and DefaultLanguage otherwise.
func AsLanguage(value string) string {
	if IsLanguage(value) {
		return value
	}
	return DefaultLanguage
}
