package http

import (
	"io/fs"
	"net/http"
	"os"
	"strings"
)

// staticFiles serves the files under dir at /public/, like @fastify/static. There is no
// directory listing: a folder answers Nest's 404, as does a file that does not exist.
func staticFiles(dir string) http.Handler {
	files := os.DirFS(dir)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/public/")

		if !fs.ValidPath(name) {
			writeRouteNotFound(w, r)
			return
		}

		info, err := fs.Stat(files, name)
		if err != nil || !info.Mode().IsRegular() {
			writeRouteNotFound(w, r)
			return
		}

		http.ServeFileFS(w, r, files, name)
	})
}
