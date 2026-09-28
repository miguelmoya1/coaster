package httpapi

import (
	"errors"
	"net/http"

	"coaster-api/internal/adapter/handler/respond"
)

func writeError(w http.ResponseWriter, err error) {
	var reqErr *requestError
	if errors.As(err, &reqErr) {
		if reqErr.validation != nil {
			respond.NestError(w, reqErr.status, reqErr.validation)
		} else {
			respond.PlainError(w, reqErr.status, reqErr.message)
		}
		return
	}

	respond.Error(w, err)
}

func writeSuccess(w http.ResponseWriter) {
	respond.JSON(w, http.StatusOK, map[string]bool{"success": true})
}

func writeRouteNotFound(w http.ResponseWriter, r *http.Request) {
	respond.NestError(w, http.StatusNotFound, "Cannot "+r.Method+" "+r.URL.RequestURI())
}
