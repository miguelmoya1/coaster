package middleware

import (
	"net/http"

	"github.com/klauspost/compress/gzhttp"
)

// Compress gzips responses of 1 KB or more, like @fastify/compress. Server-sent
// events are never compressed: each message has to reach the browser as it is written.
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
