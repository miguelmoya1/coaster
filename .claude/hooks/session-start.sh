#!/bin/bash
# Deja una sesión de Claude Code en la nube lista para lanzar los tests de apps/coaster-api
# (testcontainers necesita Docker) y los e2e contra Go (Node 26 por Temporal, Go de go.mod).
# En local no hace nada.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
log=/tmp/session-start.log
: > "$log"

# Docker: el daemon está instalado pero no arranca solo.
# Si ya hay un dockerd (arrancando o parándose) se espera a ese; un docker.pid sin
# proceso detrás impide arrancar otro.
if ! docker info > /dev/null 2>&1; then
  if ! pgrep -x dockerd > /dev/null; then
    rm -f /var/run/docker.pid
    nohup dockerd > /tmp/dockerd.log 2>&1 &
  fi
  for _ in $(seq 1 60); do
    docker info > /dev/null 2>&1 && break
    sleep 1
  done
fi
docker info > /dev/null 2>&1 || { echo "dockerd no arranca: mira /tmp/dockerd.log"; exit 1; }

# Node 26 (la imagen trae otro).
node_dir=/opt/node26
if [ ! -x "$node_dir/bin/node" ]; then
  version=$(curl -fsS https://nodejs.org/dist/index.json \
    | python3 -c 'import json,sys; print(next(r["version"] for r in json.load(sys.stdin) if r["version"].startswith("v26.")))')
  mkdir -p "$node_dir"
  curl -fsS "https://nodejs.org/dist/$version/node-$version-linux-x64.tar.xz" \
    | tar -xJ -C "$node_dir" --strip-components=1
fi
export PATH="$node_dir/bin:$PATH"

# Go: el de go.mod, que la imagen no trae.
export GOTOOLCHAIN=go1.27.0

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$node_dir/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
  echo "export GOTOOLCHAIN=$GOTOOLCHAIN" >> "$CLAUDE_ENV_FILE"
fi

{
  npm install --no-audit --no-fund
  npm run db:gen -w apps/api
  (cd apps/coaster-api && go mod download)
  (cd apps/database && go mod download)
  docker pull -q postgres:18-alpine
  docker pull -q postgres:16-alpine
} >> "$log" 2>&1 || { echo "Falló la preparación de la sesión: mira $log"; exit 1; }

echo "Entorno listo: Docker, Node $(node --version), $(go version | cut -d' ' -f3). Log en $log."
