package domain

func NilIfEmpty(value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	return value
}
