package http

import "net/http"

// writeSuccess answers 200 with {"success":true}, Nest's commonMapper.getSuccessResponse().
func writeSuccess(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
