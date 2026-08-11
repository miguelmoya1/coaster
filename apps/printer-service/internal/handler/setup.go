package handler

import (
	"encoding/json"
	"html/template"
	"net/http"
	"strings"
)

// Pairer spends a code and remembers the result. Kept as an interface so the handler can be tested
// without the network.
type Pairer interface {
	Pair(code string) error
	Paired() bool
}

const setupPage = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coaster · Impresora</title><style>
body{font-family:system-ui,sans-serif;background:#141414;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}
main{width:min(28rem,90vw);background:#1e1e1e;border:1px solid #333;border-radius:16px;padding:2rem}
h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#aaa;line-height:1.5;margin:0 0 1.5rem}
input{width:100%;box-sizing:border-box;font-size:1.5rem;letter-spacing:.2em;text-align:center;text-transform:uppercase;
padding:.75rem;border-radius:12px;border:1px solid #444;background:#141414;color:#fff}
button{width:100%;margin-top:1rem;padding:.85rem;border:0;border-radius:12px;background:#ff7a33;color:#000;font-weight:700;font-size:1rem;cursor:pointer}
.ok{color:#4ade80}.err{color:#f87171}
</style></head><body><main>
<h1>{{if .Paired}}Impresora conectada{{else}}Conecta tu impresora{{end}}</h1>
{{if .Paired}}<p class="ok">Ya está lista. Puedes cerrar esta ventana.</p>{{else}}
<p>Escribe el código que te muestra Coaster en Ajustes → Impresora.</p>
<form method="post"><input name="code" maxlength="8" autofocus autocomplete="off" placeholder="XXXXXXXX">
<button type="submit">Conectar</button></form>
{{if .Error}}<p class="err">{{.Error}}</p>{{end}}{{end}}
</main></body></html>`

var setupTemplate = template.Must(template.New("setup").Parse(setupPage))

// NewSetupHandler serves the way back when the file name carried no code: someone renamed the
// download, or moved it, and the bridge has no other way to learn where it belongs.
func NewSetupHandler(pairer Pairer) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		view := struct {
			Paired bool
			Error  string
		}{Paired: pairer.Paired()}

		if r.Method == http.MethodPost && !view.Paired {
			if err := pairer.Pair(strings.ToUpper(strings.TrimSpace(r.FormValue("code")))); err != nil {
				view.Error = "Ese código no vale. Descarga la impresora otra vez desde Coaster."
			} else {
				view.Paired = true
			}
		}

		if strings.Contains(r.Header.Get("Accept"), "application/json") {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(view)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		setupTemplate.Execute(w, view)
	})
}
