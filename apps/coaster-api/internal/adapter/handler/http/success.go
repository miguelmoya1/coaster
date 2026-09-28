package http

import "net/http"

func writeSuccess(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
