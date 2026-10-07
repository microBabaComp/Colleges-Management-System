#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
"$ROOT/scripts/up.sh" --db-only
cd "$ROOT"
export DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=collegeos DB_USER=collegeos
export DB_PASSWORD_FILE="$ROOT/.secrets/db_password" BOOTSTRAP_TOKEN_FILE="$ROOT/.secrets/bootstrap_token"
export APP_ORIGIN=http://localhost:8080 PORT=8080 NODE_ENV=development
npm install
npm run dev
