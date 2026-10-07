#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install Docker Engine and the Compose plugin." >&2; exit 1; }
umask 077
mkdir -p .secrets
chmod 700 .secrets
if [ ! -s .secrets/db_password ]; then openssl rand -hex 48 > .secrets/db_password; fi
TOKEN_CREATED=0
if [ ! -s .secrets/bootstrap_token ]; then openssl rand -hex 48 > .secrets/bootstrap_token; TOKEN_CREATED=1; fi
chmod 600 .secrets/db_password .secrets/bootstrap_token
if [ "${1:-}" = "--db-only" ]; then
  docker compose up -d db
  echo "PostgreSQL is running for local development."
else
  docker compose up --build -d
  echo "CollegeOS is available at http://localhost:8080"
fi
if [ "$TOKEN_CREATED" = "1" ]; then echo "One-time setup token (keep private): $(cat .secrets/bootstrap_token)"; fi
