package domain

import "errors"

type ErrorKind int

const (
	KindBadRequest ErrorKind = iota + 1
	KindUnauthorized
	KindPaymentRequired
	KindForbidden
	KindNotFound
	KindConflict
	KindTooManyRequests
	KindInternal
	KindServiceUnavailable
)

type Error struct {
	Kind ErrorKind
	Code string
}

func (e *Error) Error() string {
	return e.Code
}

func BadRequest(code string) *Error         { return &Error{Kind: KindBadRequest, Code: code} }
func Unauthorized(code string) *Error       { return &Error{Kind: KindUnauthorized, Code: code} }
func PaymentRequired(code string) *Error    { return &Error{Kind: KindPaymentRequired, Code: code} }
func Forbidden(code string) *Error          { return &Error{Kind: KindForbidden, Code: code} }
func NotFound(code string) *Error           { return &Error{Kind: KindNotFound, Code: code} }
func Conflict(code string) *Error           { return &Error{Kind: KindConflict, Code: code} }
func TooManyRequests(code string) *Error    { return &Error{Kind: KindTooManyRequests, Code: code} }
func Internal(code string) *Error           { return &Error{Kind: KindInternal, Code: code} }
func ServiceUnavailable(code string) *Error { return &Error{Kind: KindServiceUnavailable, Code: code} }

func HasCode(err error, code string) bool {
	var domainErr *Error
	return errors.As(err, &domainErr) && domainErr.Code == code
}
