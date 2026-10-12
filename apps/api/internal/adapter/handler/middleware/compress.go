package middleware

import (
	"net/http"

	"github.com/klauspost/compress/gzhttp"
)

func Compress(next http.Handler) (http.Handler, error) {
	wrap, err := gzhttp.NewWrapper(
		gzhttp.MinSize(1024),
		gzhttp.ExceptContentTypes([]string{"text/event-stream"}),
	)
	if err != nil {
		return nil, err
	}

	return wrap(next), nil
}
