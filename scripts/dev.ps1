$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot "up.ps1") -DatabaseOnly
if ($LASTEXITCODE -ne 0) { throw "Could not start PostgreSQL." }
Push-Location $root
try {
  $env:DB_HOST = "127.0.0.1"; $env:DB_PORT = "5432"; $env:DB_NAME = "collegeos"; $env:DB_USER = "collegeos"
  $env:DB_PASSWORD_FILE = Join-Path $root ".secrets\db_password"
  $env:BOOTSTRAP_TOKEN_FILE = Join-Path $root ".secrets\bootstrap_token"
  $env:APP_ORIGIN = "http://localhost:8080"; $env:PORT = "8080"; $env:NODE_ENV = "development"
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
  npm run dev
} finally { Pop-Location }
