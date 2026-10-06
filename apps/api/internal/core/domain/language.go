package domain

import "slices"

var Languages = []string{"es", "en"}

func IsLanguage(value string) bool {
	return slices.Contains(Languages, value)
}

func AsLanguage(value string) string {
	if IsLanguage(value) {
		return value
	}
	return DefaultLanguage
}
